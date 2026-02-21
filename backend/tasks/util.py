import json
from typing import Any

from openai import OpenAI

from pairdraft.aws_manager import aws_manager, BUCKETS
from documents.models import Document
from tasks.models import Task
from datetime import datetime
import logging
logger = logging.getLogger('django')
from bs4 import BeautifulSoup


def generate_tasks(document_id: str) -> None:
    """Generates tasks from the offer document."""
    logger.info("Generating tasks for an offer document...")
    document = Document.objects.get(id=document_id)
    
    if not document:
        logger.info("No document was found.")
        return
    
    # initialize the LLM
    llm = OpenAI()
    
    # Get the purchase agreement from the S3 bucket
    response = aws_manager.get_object(bucket=BUCKETS.PAIRDRAFT_DOCUMENTS.value, file_path=document.get_file_path(Document.HTML))
    streaming_body = response['Body']
    
    # TODO: get the buyer and seller from the document
    #   either scan through to find the buyer/seller clause
    #   or potentially store information in the header of the document as a comment (or another way to store metadata)
    #   or store the buyer/seller role info in the Task model
    #   or create a DocumentContext (or AgentContext) model to store the context for a Document

    # Read chunks at a time
    chunk_size = 1024  # 1 KB
    while True:
        html_content = streaming_body.read(chunk_size).decode('utf-8')
        if not html_content:
            break

        # Parse the HTML with BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Iterate through elements (for example, all <p> tags)
        for paragraph in soup.find_all('p'):
            find_task(paragraph.get_text(), llm, document, None, None)
    
    streaming_body.close()
    

def find_task(paragraph: str, llm: Any, document: Document, buyer: 'users.UserProfile', seller: 'users.UserProfile') -> None:
    # TODO: solve this error: RuntimeWarning: DateTimeField Task.due_date received a naive datetime (2024-09-25 20:48:26.715124) while time zone support is active.

    system_message = f"""You are given a paragraph from a purchase agreement that has already been signed by a buyer and a seller.  
    Your task is to identify the task from the given paragraph, if any.
    
    We only consider something as a task if it has a clear due date and role. 
    If you do not identify an task in the paragraph, simply return an empty object.

    If there is a task, return a JSON object (using double quotes) with the following:
    - "title": a short description of the task to be performed
    - "due_date": the date when the task is to be performed by.  For example, "2024-09-24T00:00:00Z"
    - "role": the role of the person performing the task, either "buyer" or "seller"
    
    Here is the paragraph: {paragraph}
    and here is today's date (which is the date that the agreement has been accepted) to calculate the value for "due_date": {datetime.now().isoformat()}
    """
    # messages: List[BaseMessage] = [
    #     SystemMessage(content=system_message)
    # ]
    messages = []
    
    llm_response = llm(messages).content
    print("paragraph: \n", paragraph)
    print("llm_response: \n", llm_response)
    
    kwargs = json.loads(llm_response)
    
    if not kwargs:  # no task found
        return

    task = Task.objects.create(
        title=kwargs.get("title"),
        due_date=kwargs.get("due_date"),
        user_profile=buyer if kwargs.get("role") == "buyer" else seller,
        source=document
    )
    task.save()
    
    logger.info(f"Task created: {task}")