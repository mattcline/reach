# AWS Manager singleton

import os
from enum import Enum
import logging
logger = logging.getLogger('django')

import boto3
from botocore.exceptions import ClientError


class BUCKETS(str, Enum):
    KOYA_PROPERTY_IMAGES = 'koya-property-images'
    PAIRDRAFT_DOCUMENTS = 'pairdraft-documents'
    

class AWSManager(object):
    def __init__(self):        
        self.s3_client = boto3.client(
            service_name='s3',
            region_name=os.environ.get('AWS_DEFAULT_REGION'),
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
        )

    def generate_presigned_url(self, client_method_name, method_parameters,
                               expiration=3600, http_method=None) -> str | None:
        """
        Checks if the key exists before generating a presigned URL.

        Parameters:
        client_method_name (string): Name of the S3.Client method, e.g., 'put_object' for uploading or 'get_object' for downloading.
        method_parameters: Dictionary of parameters to send to the method.
        expiration: Time in seconds for the presigned URL to remain valid.
        http_method: HTTP method to use (GET, etc.).
        
        Returns:
        str, None: Presigned URL as string. If key doesn't exist or there's an error, returns None.
        """
        try:
            # first verify the key exists
            self.s3_client.head_object(
                Bucket=method_parameters.get('Bucket'),
                Key=method_parameters.get('Key')
            )
            
            # if key exists, proceed to generate presigned URL
            try:
                response = self.s3_client.generate_presigned_url(
                    ClientMethod=client_method_name,
                    Params=method_parameters,
                    ExpiresIn=expiration,
                    HttpMethod=http_method
                )
            except ClientError as e:
                logger.error(e)
                return None

            return response

        except ClientError as e:
            if e.response['Error']['Code'] == "404":
                # the key does not exist
                if client_method_name == 'get_object':
                    return None
                
                # generate a presigned URL for a new key
                elif client_method_name == 'put_object':
                    return self.s3_client.generate_presigned_url(
                        ClientMethod=client_method_name,
                        Params=method_parameters,
                        ExpiresIn=expiration,
                        HttpMethod=http_method
                    )
            else:
                # some other error occurred
                raise e
    
    def get_object(self, bucket, file_path):
        return self.s3_client.get_object(Bucket=bucket, Key=file_path)
    
    def upload_object(self, bucket, file_path, body='', content_type='text/html'):
        self.s3_client.put_object(Bucket=bucket, Key=file_path, Body=body, ContentType=content_type)
    
    def delete_object(self, bucket, key):
        try:
            response = self.s3_client.delete_object(Bucket=bucket, Key=key)
        except ClientError as e:
            logger.error(e)
            return None
        return response
    
    def copy_object(self, source_bucket, source_file_path, destination_bucket, destination_file_path):
        try:
            # first verify the key exists
            self.s3_client.head_object(Bucket=source_bucket, Key=source_file_path)
            
            # if key exists, proceed to copy the object
            try:
                response = self.s3_client.copy_object(
                    CopySource={
                        'Bucket': source_bucket,
                        'Key': source_file_path
                    },
                    Bucket=destination_bucket,
                    Key=destination_file_path
                )
            except ClientError as e:
                logger.error(e)
                return None

            return response

        except ClientError as e:
            if e.response['Error']['Code'] == "404":
                # the source key does not exist
                return None
            else:
                # some other error occurred
                raise e
    
    def object_exists(self, bucket, file_path):
        """Check if an object exists in S3"""
        try:
            self.s3_client.head_object(Bucket=bucket, Key=file_path)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == "404":
                return False
            else:
                # some other error occurred
                raise e
    
    def download_object(self, bucket, file_path):
        """Download an object from S3 and return its content as a string"""
        try:
            response = self.s3_client.get_object(Bucket=bucket, Key=file_path)
            return response['Body'].read().decode('utf-8')
        except ClientError as e:
            logger.error(e)
            return None

aws_manager = AWSManager()
    