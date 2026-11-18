# n8n-nodes-parsewise

An independent community node, not affiliated with Parsewise. Extract structured data from binary documents using Parsewise.

## Installation

Install `n8n-nodes-parsewise` in n8n community nodes. Create a Parsewise API key under Developer > API Keys and add it to Parsewise API credentials. See https://docs.parsewise.ai/api for authentication and request details.

## Operations

Extract documents (one or more named binary properties), get project status, list results (a page per request), get a result, create dimension, list and create webhooks. Extract returns a project ID; poll status before reading results. Documents can be passed as n8n binaries and/or as URLs that the node downloads. The API requires a JSON Schema and an explicit auto-map choice.

Webhook delivery uses custom shared headers according to the docs. No trigger is provided because signature verification is not documented.

## About the author

Khairul Muhtadin, n8n Ambassador (https://www.linkedin.com/in/khmuhtadin).

## Notes from live testing

- Extract is asynchronous: it returns `project_id`. Poll the project status operation until `pipeline_running` is `false` and `schema_status` is `success`, then list or get results.
- With auto-map on, uploading several near-identical documents in one call can make Parsewise create duplicate agent names and fail the schema mapping (`schema_status: failed`). Extract one document per project when in doubt.
