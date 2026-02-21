# Check usage: https://acrobatservices.adobe.com/dc-integration-creation-app-cdn/main.html?

import os
import requests


def get_access_token():
    # TODO: handle token expiration, figuring out if we should store it, etc.
    # because right now we're generating a new token every time this function is called
    # which is wasteful
    response = requests.post(
        "https://pdf-services.adobe.io/token",
        data={
            "client_id": os.environ.get('ADOBE_PDF_SERVICES_API_CLIENT_ID'),
            "client_secret": os.environ.get('ADOBE_PDF_SERVICES_API_CLIENT_SECRET')
        }
    )
    data = response.json()
    
    return data.get('access_token', None) # { "access_token", "token_type", "expires_in" }


# TODO: make this an async request if we need to poll for the result
def html_to_pdf(input_uri: str, output_uri: str) -> str | None:
    """
    Kicks off a job to convert an HTML document to a PDF.
    Returns the job id.

    https://developer.adobe.com/document-services/docs/apis/#tag/Html-to-PDF/operation/pdfoperations.htmltopdf
    """
    token = get_access_token()
    response = requests.post(
        "https://pdf-services.adobe.io/operation/htmltopdf",
        json={
            "input": {
                "uri": input_uri,
                "storage": "S3"
            },
            "output": {
                "uri": output_uri,
                "storage": "S3"
            },
            "params": {
                "pageLayout": {
                    "pageWidth": 8.5,
                    "pageHeight": 11
                }
            }
        },
        headers={
            "Authorization": f"Bearer {token}",
            "x-api-key": os.environ.get('ADOBE_PDF_SERVICES_API_CLIENT_ID')
        }
    )
    return response.headers.get('x-request-id')    


def get_job_status(job_id: str):
    token = get_access_token()
    response = requests.get(
        f"https://pdf-services.adobe.io/operation/htmltopdf/{job_id}/status",
        headers={
            "Authorization": f"Bearer {token}",
            "x-api-key": os.environ.get('ADOBE_PDF_SERVICES_API_CLIENT_ID')
        }
    )
    data = response.json()
    return data.get('status', None)
