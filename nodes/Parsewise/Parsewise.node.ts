import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';
const field = (displayName: string, name: string, ops: string[], required = true): INodeProperties => ({ displayName, name, type: 'string', default: '', required, displayOptions: { show: { operation: ops } } });
export class Parsewise implements INodeType {
 description: INodeTypeDescription = { displayName: 'Parsewise', name: 'parsewise', icon: { light: 'file:parsewise.svg', dark: 'file:parsewise.dark.svg' }, group: ['transform'], version: 1, subtitle: '={{$parameter.resource + ": " + $parameter.operation}}', description: 'Extract and retrieve structured document data with Parsewise', defaults: { name: 'Parsewise' }, inputs: [NodeConnectionTypes.Main], outputs: [NodeConnectionTypes.Main], usableAsTool: true, credentials: [{ name: 'parsewiseApi', required: true }], properties: [
 { displayName: 'Resource', name: 'resource', type: 'options', noDataExpression: true, default: 'document', options: [ { name: 'Dimension', value: 'dimension' }, { name: 'Document', value: 'document' }, { name: 'Project', value: 'project' }, { name: 'Result', value: 'result' }, { name: 'Webhook', value: 'webhook' } ] },
 { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'extract', displayOptions: { show: { resource: ['document'] } }, options: [
  { name: 'Extract', value: 'extract', action: 'Extract documents' },
 ] },
 { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'getStatus', displayOptions: { show: { resource: ['project'] } }, options: [
  { name: 'Get Status', value: 'getStatus', action: 'Get project processing status' },
 ] },
 { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'listResults', displayOptions: { show: { resource: ['result'] } }, options: [
  { name: 'Get', value: 'getResult', action: 'Get a result' },
  { name: 'List', value: 'listResults', action: 'List results' },
 ] },
 { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'createDimension', displayOptions: { show: { resource: ['dimension'] } }, options: [
  { name: 'Create', value: 'createDimension', action: 'Create a dimension' },
 ] },
 { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'listWebhooks', displayOptions: { show: { resource: ['webhook'] } }, options: [
  { name: 'Create', value: 'createWebhook', action: 'Create a webhook' },
  { name: 'List', value: 'listWebhooks', action: 'List webhooks' },
 ] },
 { ...field('Binary Properties', 'binaryProperties', ['extract'], false), default: 'data', description: 'Comma-separated names of binary properties containing documents' },
 { ...field('Document URLs', 'documentUrls', ['extract'], false), description: 'Optional comma- or newline-separated URLs of documents to download and extract' },
 { ...field('JSON Schema', 'schema', ['extract']), default: '{"type":"object","properties":{"name":{"type":"string"}}}', typeOptions: { rows: 4 }, description: 'JSON Schema for the desired output' },
 { displayName: 'Auto Map', name: 'autoMap', type: 'boolean', default: true, description: 'Whether to generate agents and launch the extraction pipeline automatically', displayOptions: { show: { operation: ['extract'] } } },
 field('Project Name', 'projectName', ['extract'], false),
 field('Project ID', 'projectId', ['listResults','getResult','getStatus','createDimension']),
 field('Result ID', 'resultId', ['getResult']),
 field('Dimension Name', 'dimensionName', ['createDimension']),
 field('Description', 'dimensionDescription', ['createDimension'], false),
 field('Webhook URL', 'webhookUrl', ['createWebhook']),
 { ...field('Events', 'events', ['createWebhook']), default: 'agent.completion.succeeded', description: 'Comma-separated Parsewise event names' },
 field('Webhook Name', 'webhookName', ['createWebhook'], false),
 { ...field('Custom Headers JSON', 'headers', ['createWebhook'], false), default: '{}', description: 'JSON object of custom headers for webhook delivery' },
 { displayName: 'Page', name: 'page', type: 'number', default: 1, displayOptions: { show: { operation: ['listResults'] } }, typeOptions: { minValue: 1 } },
 { displayName: 'Page Size', name: 'pageSize', type: 'number', default: 100, displayOptions: { show: { operation: ['listResults'] } }, typeOptions: { minValue: 1 } },
 ] };
 async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
 const out: INodeExecutionData[] = [];
 for (let i=0;i<this.getInputData().length;i++) { try {
 const op=String(this.getNodeParameter('operation',i)); const p=(name:string)=>String(this.getNodeParameter(name,i));
 let url='https://api.parsewise.ai/api/v1'; let method: 'GET'|'POST'='GET'; let body: IDataObject | Buffer | undefined; let headers: IDataObject | undefined; let qs: IDataObject | undefined;
 const project=()=>encodeURIComponent(p('projectId'));
 // https://docs.parsewise.ai/api/extract/extract_create/
 if(op==='extract') { url+='/extract/'; method='POST'; const schema=p('schema'); JSON.parse(schema); const boundary='n8n-'+randomBytes(16).toString('hex'); const chunks: Buffer[]=[];
 const add=(name:string,value:string)=>chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
 add('schema',schema); add('auto_map',String(this.getNodeParameter('autoMap',i))); const name=p('projectName'); if(name) add('project_name',name);
 const keys=p('binaryProperties').split(',').map(s=>s.trim()).filter(Boolean); const urls=String(this.getNodeParameter('documentUrls',i,'')).split(/[\s,]+/).filter(Boolean); if(!keys.length&&!urls.length) throw new NodeOperationError(this.getNode(),'Provide at least one binary property or document URL',{itemIndex:i});
 for(const u of urls){ const file=await this.helpers.httpRequest({url:u,method:'GET',encoding:'arraybuffer',returnFullResponse:true}); const buf=Buffer.from(file.body as ArrayBuffer); const filename=(decodeURIComponent(new URL(u).pathname.split('/').pop()||'')||'document').replace(/["\r\n]/g,'_'); const mime=String((file.headers as IDataObject)['content-type']||'application/octet-stream').split(';')[0].replace(/[\r\n]/g,''); chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`),buf,Buffer.from('\r\n')); }
 for(const key of keys){ const meta=this.helpers.assertBinaryData(i,key); const data=await this.helpers.getBinaryDataBuffer(i,key); const filename=(meta.fileName||'document').replace(/["\r\n]/g,'_'); const mime=(meta.mimeType||'application/octet-stream').replace(/[\r\n]/g,''); chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`),data,Buffer.from('\r\n')); }
 chunks.push(Buffer.from(`--${boundary}--\r\n`)); body=Buffer.concat(chunks); headers={'Content-Type':`multipart/form-data; boundary=${boundary}`};
 } // https://docs.parsewise.ai/api/results/projects_results_retrieve/
 else if(op==='listResults'){url+=`/projects/${project()}/results/`; qs={page:this.getNodeParameter('page',i),page_size:this.getNodeParameter('pageSize',i)};}
 // https://docs.parsewise.ai/api/results/projects_results_retrieve_2/
 else if(op==='getResult') url+=`/projects/${project()}/results/${encodeURIComponent(p('resultId'))}/`;
 // https://docs.parsewise.ai/api/projects/projects_status_retrieve/
 else if(op==='getStatus') url+=`/projects/${project()}/status/`;
 // https://docs.parsewise.ai/api/dimensions/projects_dimensions_create/
 else if(op==='createDimension'){url+=`/projects/${project()}/dimensions/`;method='POST';body={name:p('dimensionName')};const desc=p('dimensionDescription');if(desc) body.description=desc;}
 // https://docs.parsewise.ai/api/webhooks/webhooks_list/ and https://docs.parsewise.ai/api/webhooks/webhooks_create/
 else if(op==='listWebhooks') url+='/webhooks/';
 else if(op==='createWebhook'){url+='/webhooks/'; method='POST';body={url:p('webhookUrl'),subscribed_events:p('events').split(',').map(s=>s.trim()).filter(Boolean),headers:JSON.parse(p('headers'))}; const name=p('webhookName');if(name) body.name=name;}
 else throw new NodeOperationError(this.getNode(),'Unknown operation',{itemIndex:i});
 const response=await this.helpers.httpRequestWithAuthentication.call(this,'parsewiseApi',{url,method,body,headers,qs,json:!(body instanceof Buffer)});
 if(Array.isArray(response)) for(const row of response) out.push({json:row,pairedItem:{item:i}}); else out.push({json:response as IDataObject,pairedItem:{item:i}});
 } catch(e){if(!this.continueOnFail()) throw e instanceof NodeOperationError?e:new NodeOperationError(this.getNode(),e as Error,{itemIndex:i});out.push({json:{error:(e as Error).message},pairedItem:{item:i}});} }
 return [out]; }
}
