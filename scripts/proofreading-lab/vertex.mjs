import {createSign} from 'node:crypto';
const tokenUrl='https://oauth2.googleapis.com/token';
const encoded=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
export function assertionFor(credentials, now=Math.floor(Date.now()/1000)) {
  if(credentials?.type!=='service_account'||typeof credentials.client_email!=='string'||!credentials.client_email.endsWith('.gserviceaccount.com')||typeof credentials.private_key!=='string')throw Error('Invalid service account configuration');
  const unsigned=`${encoded({alg:'RS256',typ:'JWT'})}.${encoded({iss:credentials.client_email,scope:'https://www.googleapis.com/auth/cloud-platform',aud:tokenUrl,iat:now,exp:now+3600})}`;
  const signature=createSign('RSA-SHA256').update(unsigned).sign(credentials.private_key,'base64url');
  return `${unsigned}.${signature}`;
}
export function createVertex(env, fetcher=fetch) {
  if(!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(env.GCP_PROJECT_ID??''))throw Error('GCP_PROJECT_ID required');
  const location=env.GCP_LOCATION||'global';
  if(!/^[a-z][a-z0-9-]+$/.test(location))throw Error('Invalid GCP_LOCATION');
  if(!env.GOOGLE_SERVICE_ACCOUNT_KEY_B64)throw Error('GOOGLE_SERVICE_ACCOUNT_KEY_B64 required');
  let credentials;
  try{credentials=JSON.parse(Buffer.from(env.GOOGLE_SERVICE_ACCOUNT_KEY_B64,'base64').toString('utf8'));}catch{throw Error('Invalid service account encoding');}
  let token,expires=0;
  return async (model,body)=>{
    if(!/^[a-z0-9.-]+$/.test(model))throw Error('Invalid model');
    if(Date.now()>expires){
      const response=await fetcher(tokenUrl,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:assertionFor(credentials)})});
      if(!response.ok)throw Error(`Google authentication HTTP ${response.status}`);
      const payload=await response.json();
      if(typeof payload.access_token!=='string'||!Number.isFinite(payload.expires_in)||payload.expires_in<120)throw Error('Invalid authentication response');
      token=payload.access_token;expires=Date.now()+(payload.expires_in-60)*1000;
    }
    const host=location==='global'?'aiplatform.googleapis.com':`${location}-aiplatform.googleapis.com`;
    const response=await fetcher(`https://${host}/v1/projects/${env.GCP_PROJECT_ID}/locations/${location}/publishers/google/models/${model}:generateContent`,{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(60000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),
    });
    // Never echo provider errors: they may contain submitted text or credentials.
    if(!response.ok)throw Error(`Vertex HTTP ${response.status}`);
    return response.json();
  };
}
