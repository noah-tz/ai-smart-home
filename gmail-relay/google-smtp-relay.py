import smtpd
import asyncore
import base64
import json
import os
import sys
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
import argparse

SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def get_service(config_path, token_path):
    creds = None
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(config_path, SCOPES)
            creds = flow.run_local_server(port=0, open_browser=False)
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    return build('gmail', 'v1', credentials=creds)

class GmailRelay(smtpd.SMTPServer):
    def __init__(self, localaddr, remoteaddr, service):
        self.service = service
        super().__init__(localaddr, remoteaddr)

    def process_message(self, peer, mailfrom, rcpttos, data, **kwargs):
        try:
            raw = base64.urlsafe_b64encode(data).decode()
            self.service.users().messages().send(userId='me', body={'raw': raw}).execute()
            print(f'Sent message from {mailfrom}')
        except Exception as e:
            print(f'Error: {e}')

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--port", type=int, default=2525)
    args = parser.parse_args()
    
    service = get_service(args.config, args.token)
    server = GmailRelay(('0.0.0.0', args.port), None, service)
    print(f"SMTP Relay running on port {args.port}...")
    asyncore.loop()
