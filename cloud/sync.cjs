const {synchronize}=require('./synchronize.cjs');

async function run() {
  const account=process.env.CLOUDFLARE_ACCOUNT_ID;
  const db=process.env.CLOUDFLARE_D1_ID;
  const token=process.env.CLOUDFLARE_API_TOKEN;
  const henrik=process.env.HENRIK_API_KEY;
  if(!account||!db||!token||!henrik)throw Error('Required synchronization secrets are missing');
  async function query(sql,params=[]) {
    const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database/'+db+'/query',
      {method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({sql,params}),signal:AbortSignal.timeout(60000)});
    const payload=await response.json();
    if(!response.ok||!payload.success)throw Error('Cloud database query failed (HTTP '+response.status+')');
    return payload.result[0].results;
  }
  await synchronize({query,henrik});
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
