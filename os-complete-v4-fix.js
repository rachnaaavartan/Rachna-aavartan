(() => {
'use strict';
const A=window.RachnaAPI;if(!A)return;
const originalCreateQuotation=A.createQuotation;
if(originalCreateQuotation&&!originalCreateQuotation.__cosPatched){
  const wrapped=async arg=>{
    if(arg&&typeof arg==='object'){
      const projectId=arg.project_id||arg.projectId;
      if(!projectId) throw new Error('Event is required');
      const q=await originalCreateQuotation(projectId);
      const patch={};
      if(arg.customer_total!=null) patch.customer_total=Number(arg.customer_total||0);
      if(arg.internal_total!=null) patch.internal_total=Number(arg.internal_total||0);
      if(arg.status) patch.status=arg.status;
      if(arg.notes!=null) patch.notes=arg.notes;
      if(Object.keys(patch).length) await A.updateQuotation(q.id,{...patch},projectId);
      return A.state.quotations.find(x=>x.id===q.id)||q;
    }
    return originalCreateQuotation(arg);
  };
  wrapped.__cosPatched=true;A.createQuotation=wrapped;
}
})();
