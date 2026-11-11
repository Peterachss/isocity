const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../workspace-data.js');
const repo=(name,extra={})=>({full_name:'owner/'+name,html_url:'https://evil.invalid',description:'Example',language:'JavaScript',stargazers_count:3,...extra});
test('all pages are fetched and duplicates removed',async()=>{
 const urls=[];const pages=[];
 const items=await D.fetchCatalog('Peterachss','starred',{fetchImpl:async url=>{urls.push(url);return {ok:true,headers:{get:()=>urls.length===1?'<https://api.github.com/users/Peterachss/starred?page=2>; rel="next"':null},json:async()=>urls.length===1?[repo('one')]:[repo('one'),repo('two')]};},onPage:items=>pages.push(items.length)});
 assert.equal(items.length,2);assert.deepEqual(pages,[1,2]);assert.match(urls[1],/page=2/);
});
test('GitHub errors are actionable and do not silently return complete lists',async()=>{
 await assert.rejects(D.fetchCatalog('Peterachss','repos',{fetchImpl:async()=>({ok:false,status:403})}),/limit reached/);
 await assert.rejects(D.fetchCatalog('Peterachss','repos',{fetchImpl:async()=>({ok:false,status:404})}),/not found/);
});
test('invalid users and unexpected response shapes are rejected',async()=>{
 await assert.rejects(D.fetchCatalog('../private','repos'),/valid GitHub/);
 await assert.rejects(D.fetchCatalog('Peterachss','repos',{fetchImpl:async()=>({ok:true,headers:{get:()=>null},json:async()=>({message:'bad'})})}),/Unexpected/);
});
test('repository normalization omits private records and untrusted link schemes',()=>{
 assert.equal(D.normalizeRepo(repo('secret',{private:true})),null);
 assert.equal(D.normalizeRepo(repo('ok',{homepage:'javascript:alert(1)'})).website,null);
 assert.equal(D.normalizeRepo(repo('ok')).url,'https://github.com/owner/ok');
 assert.equal(D.safeURL('https://user:password@example.com'),null);
 assert.equal(D.safeURL('file:///C:/secret'),null);
 assert.equal(D.safeURL('https://example.com'),'https://example.com/');
});
test('search and sorting apply across the complete catalog',()=>{
 const rows=[D.normalizeRepo(repo('beta',{stargazers_count:20,language:'Python'})),D.normalizeRepo(repo('alpha'))];
 assert.equal(D.filtered(rows,'example','Python')[0].name,'owner/beta');
 assert.equal(D.filtered(rows,'','','stars')[0].name,'owner/beta');
 assert.equal(D.filtered(rows,'','','name')[0].name,'owner/alpha');
 assert.equal(D.filtered(rows,'missing').length,0);
});
test('every building department has a unique purpose and supported types',()=>{
 assert.equal(new Set(D.departments.map(d=>d.id)).size,6);
 assert.equal(D.departments.find(d=>d.types.includes('office')).id,'repos');
 assert.equal(D.departments.find(d=>d.types.includes('school')).id,'stars');
 assert.equal(D.departments.find(d=>d.types.includes('clinic')).id,'ops');
});
