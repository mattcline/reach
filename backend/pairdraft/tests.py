import unittest
from unittest.mock import patch, MagicMock
from botocore.exceptions import ClientError
from pairdraft.aws_manager import AWSManager


class TestAWSManager(unittest.TestCase):
    # Test the generate_presigned_url method
    @patch('boto3.client')
    def test_generate_presigned_url_success(self, mock_boto_client):
        # Arrange
        mock_s3_client = MagicMock()
        mock_boto_client.return_value = mock_s3_client
        
        mock_s3_client.head_object.return_value = {}
        mock_s3_client.generate_presigned_url.return_value = 'https://example.com/presigned_url'
        
        aws_manager = AWSManager()
        method_params = {'Bucket': 'my-bucket', 'Key': 'my-key'}
        
        # Act
        result = aws_manager.generate_presigned_url('get_object', method_params)
        
        # Assert
        mock_s3_client.head_object.assert_called_once_with(Bucket='my-bucket', Key='my-key')
        mock_s3_client.generate_presigned_url.assert_called_once_with(
            ClientMethod='get_object',
            Params=method_params,
            ExpiresIn=3600,
            HttpMethod=None
        )
        self.assertEqual(result, 'https://example.com/presigned_url')

    @patch('boto3.client')
    def test_generate_presigned_url_key_not_found(self, mock_boto_client):
        # Arrange
        mock_s3_client = MagicMock()
        mock_boto_client.return_value = mock_s3_client
        
        error_response = {'Error': {'Code': '404'}}
        mock_s3_client.head_object.side_effect = ClientError(error_response, 'head_object')
        
        aws_manager = AWSManager()
        method_params = {'Bucket': 'my-bucket', 'Key': 'non-existent-key'}
        
        # Act
        result = aws_manager.generate_presigned_url('get_object', method_params)
        
        # Assert
        mock_s3_client.head_object.assert_called_once_with(Bucket='my-bucket', Key='non-existent-key')
        self.assertIsNone(result)

    @patch('boto3.client')
    def test_generate_presigned_url_put_object_key_not_found(self, mock_boto_client):
        """Ensure we create a presigned URL for a PUT request if the key does not exist."""
        # Arrange
        mock_s3_client = MagicMock()
        mock_boto_client.return_value = mock_s3_client
        
        error_response = {'Error': {'Code': '404'}}
        mock_s3_client.head_object.side_effect = ClientError(error_response, 'head_object')
        
        mock_s3_client.generate_presigned_url.return_value = 'https://example.com/presigned_url_for_put'
        
        aws_manager = AWSManager()
        method_params = {'Bucket': 'my-bucket', 'Key': 'non-existent-key'}
        
        # Act
        result = aws_manager.generate_presigned_url('put_object', method_params)
        
        # Assert
        mock_s3_client.head_object.assert_called_once_with(Bucket='my-bucket', Key='non-existent-key')
        mock_s3_client.generate_presigned_url.assert_called_once_with(
            ClientMethod='put_object',
            Params=method_params,
            ExpiresIn=3600,
            HttpMethod=None
        )
        self.assertEqual(result, 'https://example.com/presigned_url_for_put')

    @patch('boto3.client')
    def test_generate_presigned_url_client_error_in_generate_url(self, mock_boto_client):
        # Arrange
        mock_s3_client = MagicMock()
        mock_boto_client.return_value = mock_s3_client
        
        mock_s3_client.head_object.return_value = {}
        error_response = {'Error': {'Code': '500'}}
        mock_s3_client.generate_presigned_url.side_effect = ClientError(error_response, 'generate_presigned_url')
        
        aws_manager = AWSManager()
        method_params = {'Bucket': 'my-bucket', 'Key': 'my-key'}
        
        # Act
        result = aws_manager.generate_presigned_url('get_object', method_params)
        
        # Assert
        mock_s3_client.head_object.assert_called_once_with(Bucket='my-bucket', Key='my-key')
        mock_s3_client.generate_presigned_url.assert_called_once_with(
            ClientMethod='get_object',
            Params=method_params,
            ExpiresIn=3600,
            HttpMethod=None
        )
        self.assertIsNone(result)

    @patch('boto3.client')
    def test_generate_presigned_url_other_error(self, mock_boto_client):
        # Arrange
        mock_s3_client = MagicMock()
        mock_boto_client.return_value = mock_s3_client
        
        error_response = {'Error': {'Code': '500'}}
        mock_s3_client.head_object.side_effect = ClientError(error_response, 'head_object')
        
        aws_manager = AWSManager()
        method_params = {'Bucket': 'my-bucket', 'Key': 'my-key'}
        
        # Act & Assert
        with self.assertRaises(ClientError):
            aws_manager.generate_presigned_url('get_object', method_params)
            
        mock_s3_client.head_object.assert_called_once_with(Bucket='my-bucket', Key='my-key')

    # Test the copy_object method
    @patch('boto3.client')
    def test_copy_object_success(self, mock_boto_client):
        # Arrange
        mock_s3_client = MagicMock()
        mock_boto_client.return_value = mock_s3_client
        
        mock_s3_client.head_object.return_value = {}
        mock_s3_client.copy_object.return_value = {'CopyObjectResult': 'success'}
        
        aws_manager = AWSManager()
        
        # Act
        result = aws_manager.copy_object(
            'source-bucket',
            'source-file-path',
            'destination-bucket',
            'destination-file-path'
        )

        # Assert
        mock_s3_client.head_object.assert_called_once_with(Bucket='source-bucket', Key='source-file-path')
        mock_s3_client.copy_object.assert_called_once_with(
            CopySource={
                'Bucket': 'source-bucket',
                'Key': 'source-file-path'
            },
            Bucket='destination-bucket',
            Key='destination-file-path'
        )
        self.assertEqual(result, {'CopyObjectResult': 'success'})

    @patch('boto3.client')
    def test_copy_object_key_not_found(self, mock_boto_client):
        # Arrange
        mock_s3_client = MagicMock()
        mock_boto_client.return_value = mock_s3_client
        
        error_response = {'Error': {'Code': '404'}}
        mock_s3_client.head_object.side_effect = ClientError(error_response, 'head_object')
        
        aws_manager = AWSManager()
        
        # Act
        result = aws_manager.copy_object(
            'source-bucket',
            'non-existent-source-file-path',
            'destination-bucket',
            'destination-file-path'
        )
        
        # Assert
        mock_s3_client.head_object.assert_called_once_with(Bucket='source-bucket', Key='non-existent-source-file-path')
        self.assertIsNone(result)
