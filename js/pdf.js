/* ===== Gerador mínimo de PDF: uma imagem JPEG por página, A4 paisagem =====
   Usado para baixar o diploma (frente e verso) em um único arquivo. Sem dependências. */
(function(root,factory){
  if(typeof module!=='undefined'&&module.exports)module.exports=factory();else root.GQPDF=factory();
})(typeof self!=='undefined'?self:this,function(){
  const enc=s=>{const a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i)&255;return a;};
  /* images: [{data:Uint8Array (JPEG), w, h}]  ->  Uint8Array do PDF */
  function build(images,opt){
    opt=opt||{};const PW=842,PH=595;const chunks=[];let pos=0;const offs=[];
    const push=u=>{chunks.push(u);pos+=u.length;};
    const obj=(n,body)=>{offs[n]=pos;push(enc(n+' 0 obj\n'));push(typeof body==='string'?enc(body):body);push(enc('\nendobj\n'));};
    push(enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    const N=images.length;
    /* 1 catalog, 2 pages, depois por página: page, content, image */
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    const kids=images.map((_,i)=>(3+i*3)+' 0 R').join(' ');
    obj(2,'<< /Type /Pages /Kids ['+kids+'] /Count '+N+' >>');
    images.forEach((im,i)=>{
      const p=3+i*3,c=p+1,x=p+2;
      /* a imagem preenche a página inteira, mantendo a proporção do diploma (1754x1240 ≈ A4) */
      const sc=Math.min(PW/im.w,PH/im.h),w=im.w*sc,h=im.h*sc,ox=(PW-w)/2,oy=(PH-h)/2;
      obj(p,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PW+' '+PH+'] /Resources << /XObject << /Im0 '+x+' 0 R >> >> /Contents '+c+' 0 R >>');
      const cs='q '+w.toFixed(2)+' 0 0 '+h.toFixed(2)+' '+ox.toFixed(2)+' '+oy.toFixed(2)+' cm /Im0 Do Q';
      obj(c,'<< /Length '+cs.length+' >>\nstream\n'+cs+'\nendstream');
      const head=enc('<< /Type /XObject /Subtype /Image /Width '+im.w+' /Height '+im.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+im.data.length+' >>\nstream\n');
      const body=new Uint8Array(head.length+im.data.length+'\nendstream'.length);
      body.set(head,0);body.set(im.data,head.length);body.set(enc('\nendstream'),head.length+im.data.length);
      obj(x,body);
    });
    const info=3+N*3;
    obj(info,'<< /Title ('+String(opt.title||'Git Quest').replace(/[()\\]/g,'')+') /Producer (Git Quest) >>');
    const xref=pos,total=info+1;
    let x='xref\n0 '+total+'\n0000000000 65535 f \n';
    for(let n=1;n<total;n++)x+=String(offs[n]).padStart(10,'0')+' 00000 n \n';
    x+='trailer\n<< /Size '+total+' /Root 1 0 R /Info '+info+' 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
    push(enc(x));
    const out=new Uint8Array(pos);let o=0;chunks.forEach(c=>{out.set(c,o);o+=c.length;});return out;
  }
  return {build};
});
