interface PDFDocument { setFontSize(size:number):void; text(text:string,x:number,y:number):void; splitTextToSize(text:string,width:number):string[]; addPage():void; save(name:string):void }
interface PDFWindow extends Window { jspdf?: { jsPDF: new()=>PDFDocument } }
interface EstimatePDF { estimated_cost_min:number; estimated_cost_max:number; estimated_timeline_weeks:number; team_size_needed?:number; risk_level?:string; summary?:string; ai_analysis?:{summary?:string}; technology_stack?:string[]; next_steps?:string[] }
let library:Promise<void>|undefined;
function loadPDF():Promise<void> {
  if ((window as PDFWindow).jspdf) return Promise.resolve();
  return library ??= new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');
    // Same pinned PDF engine as the existing estimator, loaded only when requested.
    script.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload=()=>resolve(); script.onerror=()=>{library=undefined;script.remove();reject(new Error('PDF engine unavailable'));};
    document.head.appendChild(script);
  });
}
export async function downloadEstimatePDF(data:EstimatePDF,client:string):Promise<void> {
  await loadPDF();
  const engine=(window as PDFWindow).jspdf; if(!engine) throw new Error('PDF engine unavailable');
  const doc=new engine.jsPDF(); let y=24;
  function paragraph(value:string,size=11) {
    doc.setFontSize(size);
    for(const line of doc.splitTextToSize(value,170)) { if(y>275){doc.addPage();y=24;} doc.text(line,20,y);y+=size*.48; }
    y+=8;
  }
  const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
  paragraph('Hodges & Co. Studios | Project scope',22);paragraph(client);paragraph(`Prepared ${new Date().toLocaleDateString('en-GB')}`);
  paragraph('Initial planning estimate. Subject to scope review and an agreed proposal.');
  paragraph(`Investment: ${money.format(data.estimated_cost_min)} - ${money.format(data.estimated_cost_max)} USD`,15);
  paragraph(`Timeline: ${data.estimated_timeline_weeks} weeks`);
  if(data.team_size_needed) paragraph(`Suggested team: ${data.team_size_needed}`);
  if(data.risk_level) paragraph(`Scope risk: ${data.risk_level}`);
  paragraph('Suggested approach',16);paragraph(data.summary||data.ai_analysis?.summary||'To be reviewed with the studio.');
  paragraph('Potential technology',16);paragraph((data.technology_stack||[]).join(', '));
  if(data.next_steps?.length){paragraph('Next steps',16);data.next_steps.forEach((step,index)=>paragraph(`${index+1}. ${step}`));}
  paragraph('ohwpstudios.org | ohwpstudios@gmail.com');
  doc.save(`Hodges_Co_Project_Scope_${new Date().toISOString().slice(0,10)}.pdf`);
}
