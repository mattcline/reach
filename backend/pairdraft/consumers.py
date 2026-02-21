import json
from collections import deque
from typing import Dict, Optional, Any
from asgiref.sync import async_to_sync
import logging
logger = logging.getLogger('django')

from django.utils import timezone
from django.contrib.auth.models import User
from channels.generic.websocket import WebsocketConsumer
from channels_redis.core import RedisChannelLayer
from openai import OpenAI

from agent.models import AgentMessage
from users.models import UserProfile
from inbox.models import Message
from inbox.serializers import MessageSerializer
from tokens.models import SocketToken


def get_users_from_chat_name(chat_name: str, user: User) -> Optional[Dict[str, Any]]:
    """Get the sender and recipient user profiles from the chat name."""
    first, second = chat_name.split('_')
    first_user_profile = UserProfile.objects.filter(id=first).first()
    second_user_profile = UserProfile.objects.filter(id=second).first()
    
    if not first_user_profile or not second_user_profile:
        return None
    
    if first_user_profile.user != user and second_user_profile.user != user:
        return None
    elif first_user_profile.user == user:
        return {
            'sender': first_user_profile,
            'recipient': second_user_profile,
        }
    elif second_user_profile.user == user:
        return {
            'sender': second_user_profile,
            'recipient': first_user_profile,
        }
    return None


class ChatConsumer(WebsocketConsumer):
    channel_layer: RedisChannelLayer # add type hint to avoid errors in IDE
    
    def connect(self):
        self.accept()
        self.user = self.scope["user"]
        
        chat_name = self.scope['url_route']['kwargs']['chat_name']
        if chat_name == 'agent':
            self.llm = OpenAI()

    def disconnect(self, close_code):
        chat_name = self.scope['url_route']['kwargs']['chat_name']
        if chat_name != 'agent': # means the chat should be in a group if it's not the agent
            async_to_sync(self.channel_layer.group_discard)(chat_name, self.channel_name)

    def receive(self, text_data):
        data = json.loads(text_data)
        chat_name = self.scope['url_route']['kwargs']['chat_name']

        if chat_name == 'agent':
            document_id = data.get('document_id')
            user_message = data.get('message')
            thread_id = data.get('thread_id')
            conversation_history = data.get('conversation_history', [])
            document_text = data.get('document_text', '')
            active_mark_ids = data.get('active_mark_ids', '')

            # Get user profile
            user_profile = UserProfile.objects.filter(user=self.user).first()
            if not user_profile:
                self.send(text_data=json.dumps({"error": "User profile not found"}))
                return
            
            # Save user message to database
            if user_message and document_id:
                try:
                    from documents.models import Document
                    document = Document.objects.get(id=document_id)
                    AgentMessage.objects.create(
                        user_profile=user_profile,
                        document=document,
                        role='user',
                        content=user_message
                    )
                except Document.DoesNotExist:
                    logger.error(f"Document {document_id} not found")
            
            # # Load conversation history from database
            # conversation_history = []
            # if document_id:
            #     try:
            #         from documents.models import Document
            #         document = Document.objects.get(id=document_id)
            #         messages = AgentMessage.objects.filter(
            #             user_profile=user_profile,
            #             document=document
            #         ).order_by('timestamp')
                    
            #         for msg in messages:
            #             conversation_history.append({
            #                 "role": "assistant" if msg.role == 'agent' else "user",
            #                 "content": msg.content
            #             })
            #     except Document.DoesNotExist:
            #         logger.error(f"Document {document_id} not found")

            # Do not send message to LLM for connection request where just document_id is passed
            if not user_message:
                return

            # # Add current user message to conversation history
            if user_message:
                conversation_history.append({
                    "role": "user",
                    "content": user_message
                })

            conversation_history = [{
                'role': 'assistant' if message.get('authorDetails', {}).get('full_name') == 'ai' else 'user',
                'content': message.get('content', '')
            } for message in conversation_history]

            # It is very important to not give legal advice and if the user asks for it, you should say something like:
            # I am not a lawyer and cannot give legal advice.

            # If the user asks a question about a certain topic, you can direct them to reach out to a specialist.  For example, if they ask about the tax implications of a certain action, you can say:
            # I am not a tax specialist and cannot give tax advice.  You should reach out to a tax specialist for more information.

            # Here is another example of a disclaimer you can use to respond to a finance question:
            # This is not professional financial advice. Consulting a financial advisor about your particular circumstances is best.

            # If you do answer a question, you should try to share the source of your information.
            instructions = f"""
            You are helping multiple parties negotiate an agreement.                    

            You will be given a full document {'and a list of active mark ids to know which text is relevant.' if active_mark_ids else ''}

            If you propose changes to the document (a change is defined as a deletion AND an addition), indicate the changes at the end of your response with '[[CHANGES]]: {{changes_json_array}} where changes_json_array is a JSON array with the following example format (don't include whitespace or new lines):

            [
                {{
                    "type": "deletion",
                    "start_key": "45",
                    "start_offset": 0,
                    "end_key": "45",
                    "end_offset": 8, // i.e. length of text in node to erase the whole node
                }},
                {{
                    "type": "addition",
                    "key": "45",
                    "offset": 0,
                    "text": "abc"
                }},
            ]

            type: str (ONLY EITHER 'addition' OR 'deletion' are valid values)
            offset: int
            key, start_key, end_key: str

            If you are adding new text and the user did not designate a location, use your discretion to find the best location.

            If you propose changes, also include a justification section after your message with '[[JUSTIFICATION]]: <text>' where <text> is a brief message written in the user's voice, as if the user themselves is explaining the rationale behind the proposed change to the other parties on the document. It should read naturally as something the user would share with collaborators to justify the edit (this will be shown to all users in a comment thread).

            Response order when proposing changes:
            1. Your main message to the user
            2. [[JUSTIFICATION]]: <plain text explanation>
            3. [[CHANGES]]: <json array>
            """

            # Respond in two parts:
            # 1. A message to the user with `[[MESSAGE_END]]` at the end.
            # 2. Document content (formatted in standard Markdown) with `[[FINAL_END]]` at the end.

            # Prepare messages for OpenAI API
            messages = [{"role": "system", "content": instructions}]

            if document_text:
                messages.append({
                    'role': 'user',
                    'content': f'FULL DOCUMENT (for reference only):\n\"\"\"\n{document_text}\n\"\"\"'
                })
            if active_mark_ids:
                messages.append({
                    'role': 'user',
                    'content': f'ACTIVE MARK IDS:\n\"\"\"\n{active_mark_ids}\n\"\"\"'
                })

            messages.extend(conversation_history)
            
            stream = self.llm.chat.completions.create(
                model="gpt-5-mini",
                messages=messages,
                stream=data.get('stream', True)
            )

        # TODO: store message in db and append to history

        #             self.ws_consumer.send(text_data=json.dumps({
        #     "content": {
        #         "id": str(self.user_step.id),
        #         "content": content,
        #         "type": type,
        #         "field_type": self.document_step.field_type, # for fields like "number", "text", "select", "multi-checkbox"
        #         "choices": self.document_step.choices, # for dropdowns (select and multi-checkbox)
        #         "indent": self.document_step.indent if self.document_step.indent else 0,
        #     }
        # }))

            # if not data.get('stream', True):
            # handle AI for comment
            # message, changes = stream.choices[0].message.content.split('[[CHANGES]]:')

            # self.send(
            #     text_data=json.dumps({
            #         "message": message,
            #         "sender": "PAIRDRAFT",
            #         "streaming": True,
            #         "comment": True,
            #         "changes": changes,
            #         "thread_id": thread_id
            #     }))
                # return
            justification_delimiter = '[[JUSTIFICATION]]:'
            changes_delimiter = '[[CHANGES]]:'
            # Use the longer delimiter to determine safe streaming window
            max_delimiter_len = max(len(justification_delimiter), len(changes_delimiter))
            buffer = ""
            justification_buffer = ""
            changes_buffer = ""
            # Parsing state: 'message' -> 'justification' -> 'changes'
            parse_state = 'message'

            for chunk in stream:
                text = chunk.choices[0].delta.content
                if text is None:
                    continue

                buffer += text

                if parse_state == 'message':
                    if justification_delimiter in buffer:
                        parse_state = 'justification'
                        pre, post = buffer.split(justification_delimiter, 1)
                        self.send(text_data=json.dumps({
                            "message": pre,
                            "sender": "PAIRDRAFT",
                            "streaming": True,
                            "thread_id": thread_id
                        }))
                        buffer = post
                    elif changes_delimiter in buffer:
                        # No justification section — jump straight to changes
                        parse_state = 'changes'
                        pre, post = buffer.split(changes_delimiter, 1)
                        self.send(text_data=json.dumps({
                            "message": pre,
                            "sender": "PAIRDRAFT",
                            "streaming": True,
                            "thread_id": thread_id
                        }))
                        buffer = ""
                        changes_buffer += post
                    else:
                        # Safe to stream, hold back enough chars to catch a split delimiter
                        safe = buffer[:-max_delimiter_len]
                        if safe:
                            self.send(text_data=json.dumps({
                                "message": safe,
                                "sender": "PAIRDRAFT",
                                "streaming": True,
                                "thread_id": thread_id
                            }))
                            buffer = buffer[len(safe):]

                elif parse_state == 'justification':
                    if changes_delimiter in buffer:
                        parse_state = 'changes'
                        pre, post = buffer.split(changes_delimiter, 1)
                        justification_buffer += pre
                        buffer = ""
                        changes_buffer += post
                    else:
                        # Hold back to avoid splitting the changes delimiter
                        safe = buffer[:-max_delimiter_len]
                        if safe:
                            justification_buffer += safe
                            buffer = buffer[len(safe):]

                else:
                    # parse_state == 'changes' — accumulate silently
                    changes_buffer += text
                    buffer = ""

            # Flush any remaining buffer content based on final state
            if parse_state == 'message' and buffer:
                self.send(text_data=json.dumps({
                    "message": buffer,
                    "sender": "PAIRDRAFT",
                    "streaming": True,
                    "thread_id": thread_id
                }))
            elif parse_state == 'justification' and buffer:
                justification_buffer += buffer

            # Signal end of stream and send captured changes and justification
            self.send(text_data=json.dumps({
                "message": "",
                "sender": "PAIRDRAFT",
                "streaming": False,
                "changes": changes_buffer.strip(),
                "justification": justification_buffer.strip(),
                "thread_id": thread_id
            }))

            # self.send(text_data=json.dumps({"message": "", "sender": "PAIRDRAFT", "streaming": False}))
            # Save agent's response to database
            if buffer and document_id:
                try:
                    from documents.models import Document
                    document = Document.objects.get(id=document_id)
                    AgentMessage.objects.create(
                        user_profile=user_profile,
                        document=document,
                        role='agent',
                        content=buffer,
                        metadata={
                            'model': 'gpt-5-mini',
                            'has_document_content': bool(document)
                        }
                    )
                except Document.DoesNotExist:
                    logger.error(f"Document {document_id} not found")
            
            # if certain types of data are returned (other than messages that should be streamed),
            # then we can send them back to the frontend here
            # if response.get('data'):
            #     self.send(text_data=json.dumps(response['data']))

        else:
            # direct messages via 'groups'
            
            # authenticate user after connection is established
            if (data.get('token') is not None):
                token = data.get('token')
                self.authenticate_user_with_token(token, chat_name)
                return
            
            if not self.user:
                logger.error("User not authenticated.")
                self.close()
                return

            users_data = get_users_from_chat_name(chat_name, self.user)
            if not users_data:
                logger.error(f"User {self.user} does not have access to chat {chat_name}.  Send a message with session id first.")
                self.close()
                return
            
            message = Message.objects.create(
                sender=users_data['sender'],
                recipient=users_data['recipient'],
                content=data['content']
            )
            message.save()
            
            serializer = MessageSerializer(message)
            
            async_to_sync(self.channel_layer.group_send)(
                chat_name,
                {
                    "type": "chat.message",
                    "text": json.dumps(serializer.data),
                },
            )

    def chat_message(self, event):
        """Used to handle chat.message events from the group."""
        self.send(text_data=event["text"])
        
    def authenticate_user_with_token(self, token: str, chat_name: str):
        socket_token = SocketToken.objects.filter(token=token, date_expires__gt=timezone.now()).first()
        
        if not socket_token:
            logger.error(f"Socket token {token} not found.")
            self.close()
            return
        
        # assign the user to the consumer
        self.user = socket_token.user_profile.user
        
        # delete token after user is authenticated
        socket_token.delete()
        
        users_data = get_users_from_chat_name(chat_name, self.user)
        if not users_data:
            logger.error(f"User {self.user} does not have access to chat {chat_name}")
            self.close()
            return

        async_to_sync(self.channel_layer.group_add)(chat_name, self.channel_name)
