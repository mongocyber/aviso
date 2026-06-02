/* ===========================================================
   Aviso — Component Library · interactions + assets
   =========================================================== */
(function(){
  const NS="http://www.w3.org/2000/svg";

  /* ---------- Aperture mark ---------- */
  function pol(cx,cy,r,deg){const a=deg*Math.PI/180;return [cx+r*Math.cos(a), cy+r*Math.sin(a)];}
  function arcPath(cx,cy,r,a0,a1){
    const [sx,sy]=pol(cx,cy,r,a0),[ex,ey]=pol(cx,cy,r,a1);
    const large=((a1-a0+360)%360)>180?1:0;
    return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  }
  function markSVG(){
    const cx=50,cy=50,GAP=58;
    const rings=[{r:41,w:4.0,gap:18},{r:28,w:5.8,gap:63},{r:15,w:7.6,gap:108}];
    let p="";
    rings.forEach(r=>{p+=`<path d="${arcPath(cx,cy,r.r,r.gap+GAP/2,r.gap+360-GAP/2)}" fill="none" stroke="currentColor" stroke-width="${r.w}" stroke-linecap="round"/>`;});
    p+=`<circle cx="50" cy="50" r="6.2" fill="currentColor"/>`;
    return `<svg viewBox="0 0 100 100" fill="none">${p}</svg>`;
  }

  /* ---------- Icon set (1.5px stroke, rounded) ---------- */
  const I = {
    explain:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r=".2" fill="currentColor" stroke-width="1.6"/>',
    translate:'<text x="3.5" y="11" font-family="Hanken Grotesk,sans-serif" font-size="9.5" font-weight="700" fill="currentColor" stroke="none">A</text><text x="11" y="20.5" font-family="sans-serif" font-size="10" font-weight="600" fill="currentColor" stroke="none">\u6587</text><path d="M3.5 14.5h6"/>',
    refine:'<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/><path d="M14 7l3 3"/>',
    summarize:'<path d="M5 7h14M5 12h10M5 17h6"/>',
    send:'<path d="M21 3 3 10.5l7 2.6L12.5 20 21 3z"/><path d="M21 3 10 13.1"/>',
    screenshot:'<path d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5"/><circle cx="12" cy="12" r="2.4"/>',
    voice:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    history:'<path d="M3.6 9.5A8.5 8.5 0 1 1 4 14"/><path d="M3 5v4.5h4.5"/><path d="M12 8v4.2l3 1.8"/>',
    command:'<text x="12" y="17" text-anchor="middle" font-family="sans-serif" font-size="15" fill="currentColor" stroke="none">\u2318</text>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2.4"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    save:'<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/>',
    close:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    settings:'<path d="M4 7.5h10M4 12h13M4 16.5h7"/><circle cx="17" cy="7.5" r="2.4" fill="currentColor" stroke="none"/><circle cx="9" cy="16.5" r="2.4" fill="currentColor" stroke="none"/>',
    model:'<path d="M12 3l7.5 4.3v8.6L12 21l-7.5-5.1V7.3L12 3z"/><circle cx="12" cy="11.6" r="2.6" fill="currentColor" stroke="none"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/>',
    retry:'<path d="M20 11.5A8 8 0 1 0 18 17"/><path d="M20 5v5h-5"/>',
    key:'<circle cx="8" cy="8" r="4.2"/><path d="M11 11l8.5 8.5M16.5 16.5l2-2M19.5 19.5l1.6-1.6"/>',
    network:'<path d="M4.5 11.5a11 11 0 0 1 15 0M7.8 15a6.5 6.5 0 0 1 8.4 0"/><circle cx="12" cy="18.6" r="1.1" fill="currentColor" stroke="none"/><path d="M3 3l18 18" stroke-width="1.6"/>',
    shield:'<path d="M12 3.2l7 2.8v5.2c0 4.2-3 7.3-7 8.6-4-1.3-7-4.4-7-8.6V6l7-2.8z"/><path d="M9 11.6l2.1 2.1L15.5 9.5"/>',
    chevdown:'<path d="M6 9.5l6 6 6-6"/>',
    chevright:'<path d="M9.5 6l6 6-6 6"/>',
    continue:'<path d="M5 12h13M13 6.5l6 5.5-6 5.5"/>',
    more:'<circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    warning:'<path d="M12 4.5l8.5 15h-17l8.5-15z"/><path d="M12 10v4.2"/><circle cx="12" cy="17.3" r="1" fill="currentColor" stroke="none"/>',
    bookmark:'<rect x="4" y="5" width="14" height="14" rx="2"/><path d="M8 5v6l2.5-1.8L13 11V5"/>',
    sliders:'<path d="M4 7.5h10M4 16.5h7"/><circle cx="17" cy="7.5" r="2.4" fill="currentColor" stroke="none"/><circle cx="11" cy="16.5" r="2.4" fill="currentColor" stroke="none"/>',
    check:'<path d="M5 12.5l4.5 4.5L19 7"/>'
  };
  function iconSVG(name){
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${I[name]||''}</svg>`;
  }

  /* ---------- hydrate ---------- */
  function hydrate(root){
    (root||document).querySelectorAll('[data-mk]').forEach(el=>{ if(!el.dataset.done){el.innerHTML=markSVG(); el.dataset.done=1;} });
    (root||document).querySelectorAll('[data-ic]').forEach(el=>{ if(!el.dataset.done){el.innerHTML=iconSVG(el.dataset.ic); el.dataset.done=1;} });
  }
  window.AvisoIcons = {iconSVG, markSVG, hydrate};

  /* ---------- streaming output ---------- */
  function stream(el, html, opts){
    opts=opts||{};
    el.innerHTML="";
    // build then reveal token by token
    const tmp=document.createElement('div'); tmp.innerHTML=html;
    const cursor=document.createElement('span'); cursor.className='stream-cursor';
    function walk(src, dst){
      src.childNodes.forEach(n=>{
        if(n.nodeType===3){
          const words=n.textContent.split(/(\s+)/);
          words.forEach(w=>{ if(w==="")return; const s=document.createElement('span'); s.className='tok'; s.textContent=w; dst.appendChild(s); tokens.push(s); });
        } else {
          const c=n.cloneNode(false); dst.appendChild(c); walk(n,c);
        }
      });
    }
    const tokens=[];
    walk(tmp, el);
    el.appendChild(cursor);
    tokens.forEach(t=>t.style.animationPlayState='paused');
    let i=0; const speed=opts.speed||26;
    const timer=setInterval(()=>{
      if(i>=tokens.length){clearInterval(timer); cursor.remove(); if(opts.done)opts.done(); return;}
      tokens[i].style.animationPlayState='running';
      el.scrollTop=el.scrollHeight;
      i++;
    }, speed);
    return ()=>clearInterval(timer);
  }
  window.AvisoStream = stream;

  /* ---------- DOM ready wiring ---------- */
  document.addEventListener('DOMContentLoaded', ()=>{
    hydrate();

    /* streaming windows */
    document.querySelectorAll('[data-stream-replay]').forEach(btn=>{
      const win=document.querySelector(btn.dataset.streamReplay);
      const body=win.querySelector('.win-body .stream-target');
      const html=body.getAttribute('data-html');
      const run=()=>stream(body, html, {speed:24});
      btn.addEventListener('click', run);
      run();
    });

    /* command palette demo */
    const palette=document.querySelector('#cmdp-demo');
    if(palette){
      const input=palette.querySelector('input');
      const list=palette.querySelector('.cmdp-list');
      const intent=palette.querySelector('.cmdp-intent');
      const data=[
        {ic:'bookmark', t1:'\u5de5\u4fe1\u90e8_\u98df\u54c1\u6570\u636e', t2:'miit.gov.cn/gxsj/tjfx/xfpgy', badge:'\u4e66\u7b7e'},
        {ic:'bookmark', t1:'CloudDevOps \u5916\u5305\u5de5\u65f6', t2:'clouddevops.example.com/28679', badge:'\u4e66\u7b7e'},
        {ic:'history', t1:'\u6da6\u8272\uff1a\u8fd9\u6bb5\u4ea7\u54c1\u4ecb\u7ecd\u2026', t2:'2 \u5c0f\u65f6\u524d \u00b7 \u6da6\u8272', badge:'\u5386\u53f2'},
        {ic:'history', t1:'\u7ffb\u8bd1\uff1aMarket Trend Report', t2:'\u6628\u5929 \u00b7 \u7ffb\u8bd1', badge:'\u5386\u53f2'},
        {ic:'history', t1:'\u603b\u7ed3\uff1a\u667a\u80fd\u4eba\u673a\u4ea4\u4e92\u65b9\u6848', t2:'\u6628\u5929 \u00b7 \u603b\u7ed3', badge:'\u5386\u53f2'}
      ];
      let sel=0;
      function render(q){
        const items = q ? data.filter(d=>d.t1.toLowerCase().includes(q.toLowerCase())) : data;
        list.innerHTML='';
        sel=0;
        if(items.length===0 && q){
          palette.classList.add('has-results');
          list.style.display='none';
          intent.style.display='flex';
          intent.innerHTML = `\u65e0\u5339\u914d\u7ed3\u679c \u2014 \u56de\u8f66\u4ea4\u7ed9 <span class="pill"><span class="ic" data-ic="model"></span>Aviso</span> \u6309\u610f\u56fe\u5904\u7406 \u201c${q}\u201d`;
          hydrate(intent);
          return;
        }
        intent.style.display='none';
        list.style.display='block';
        palette.classList.add('has-results');
        items.forEach((d,idx)=>{
          const row=document.createElement('div');
          row.className='cmdp-row'+(idx===sel?' sel':'');
          row.innerHTML=`<span class="ic" data-ic="${d.ic}"></span><span class="txt"><div class="t1"></div><div class="t2"></div></span><span class="badge"></span>`;
          row.querySelector('.t1').textContent=d.t1;
          row.querySelector('.t2').textContent=d.t2;
          row.querySelector('.badge').textContent=d.badge;
          row.addEventListener('mouseenter',()=>{sel=idx; mark();});
          list.appendChild(row);
        });
        hydrate(list);
      }
      function mark(){ list.querySelectorAll('.cmdp-row').forEach((r,i)=>r.classList.toggle('sel',i===sel)); }
      input.addEventListener('input', e=>render(e.target.value.trim()));
      input.addEventListener('keydown', e=>{
        const rows=list.querySelectorAll('.cmdp-row');
        if(e.key==='ArrowDown'){e.preventDefault(); sel=Math.min(sel+1,rows.length-1); mark();}
        if(e.key==='ArrowUp'){e.preventDefault(); sel=Math.max(sel-1,0); mark();}
      });
      render('');
    }

    /* settings: tabs + toggles + save */
    document.querySelectorAll('.settings').forEach(s=>{
      const tabs=s.querySelectorAll('.set-tab');
      const panes=s.querySelectorAll('[data-pane]');
      tabs.forEach(t=>t.addEventListener('click',()=>{
        tabs.forEach(x=>x.classList.toggle('on',x===t));
        panes.forEach(p=>p.style.display = p.dataset.pane===t.dataset.tab ? 'block':'none');
      }));
      s.querySelectorAll('.sw').forEach(sw=>sw.addEventListener('click',()=>sw.classList.toggle('on')));
      const save=s.querySelector('.btn-primary');
      if(save) save.addEventListener('click',()=>{
        const orig=save.textContent; save.textContent='\u5df2\u4fdd\u5b58'; save.classList.add('saved');
        setTimeout(()=>{save.textContent=orig; save.classList.remove('saved');},1400);
      });

      /* templates: add-form toggle */
      const tplForm=s.querySelector('.tpl-form');
      const tplList=s.querySelector('.tpl-list');
      const tplAdd=s.querySelector('.tpl-add');
      const tplCount=s.querySelector('.tpl-count');
      function showForm(v){
        if(!tplForm)return;
        tplForm.style.display=v?'block':'none';
        [tplList,tplAdd,tplCount].forEach(el=>{ if(el)el.style.display=v?'none':(el===tplList?'block':'block'); });
      }
      if(tplAdd) tplAdd.addEventListener('click',()=>showForm(true));
      s.querySelectorAll('.tpl-cancel').forEach(b=>b.addEventListener('click',()=>showForm(false)));
      s.querySelectorAll('.tpl-done').forEach(b=>b.addEventListener('click',()=>{
        const name=s.querySelector('.tpl-name'), body=s.querySelector('.tpl-body');
        if(name && name.value.trim()){
          const row=document.createElement('div'); row.className='tpl-row';
          row.innerHTML='<span class="ic" data-ic="refine"></span><div class="tn"><b></b><small></small></div><button class="del tpl-del"><span class="ic" data-ic="close"></span></button>';
          row.querySelector('b').textContent=name.value.trim();
          row.querySelector('small').textContent=(body.value.trim()||'\u81ea\u5b9a\u4e49\u6a21\u677f');
          tplList.appendChild(row);
          window.AvisoIcons.hydrate(row);
          bindTplDel(row.querySelector('.tpl-del'));
          name.value=''; body.value='';
          updateCount();
        }
        showForm(false);
      }));
      /* chip insert into textarea */
      s.querySelectorAll('.chip-insert').forEach(c=>c.addEventListener('click',()=>{
        const ta=s.querySelector('.tpl-body'); if(!ta)return;
        const ins=c.dataset.ins; const st=ta.selectionStart||ta.value.length;
        ta.value=ta.value.slice(0,st)+ins+ta.value.slice(ta.selectionEnd||st);
        ta.focus();
      }));
      function updateCount(){ if(tplCount){const n=tplList.querySelectorAll('.tpl-row').length; tplCount.textContent=n+' / 20';} }
      function bindTplDel(btn){ btn.addEventListener('click',()=>{ btn.closest('.tpl-row').remove(); updateCount(); }); }
      s.querySelectorAll('.tpl-del').forEach(bindTplDel);

      /* history delete + clear */
      function bindHistDel(btn){ btn.addEventListener('click',()=>{ btn.closest('.hist-item').remove(); checkHistEmpty(); }); }
      s.querySelectorAll('.hdel').forEach(bindHistDel);
      const histList=s.querySelector('.hist-list');
      function checkHistEmpty(){ if(histList && !histList.querySelector('.hist-item')){ histList.innerHTML='<div class="hist-empty">\u8fd8\u6ca1\u6709\u8bb0\u5f55 \u2014 \u7528\u8fc7\u7684\u64cd\u4f5c\u4f1a\u51fa\u73b0\u5728\u8fd9\u91cc\u3002</div>'; } }
      const histClear=s.querySelector('.hist-clear');
      if(histClear) histClear.addEventListener('click',()=>{ histList.querySelectorAll('.hist-item').forEach(i=>i.remove()); checkHistEmpty(); });
    });

    /* copy / save buttons feedback */
    document.querySelectorAll('[data-feedback]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const lab=btn.querySelector('.lab'); if(!lab)return;
        const orig=lab.textContent; lab.textContent=btn.dataset.feedback;
        setTimeout(()=>lab.textContent=orig,1200);
      });
    });

    /* toast replay */
    document.querySelectorAll('[data-toast-replay]').forEach(btn=>{
      const toast=document.querySelector(btn.dataset.toastReplay);
      btn.addEventListener('click',()=>{
        const t=toast.querySelector('.timer');
        if(t){ t.style.animation='none'; void t.offsetWidth; t.style.animation=''; }
        toast.style.opacity=0; requestAnimationFrame(()=>{toast.style.transition='opacity .25s'; toast.style.opacity=1;});
      });
      toast.querySelectorAll('.x').forEach(x=>x.addEventListener('click',()=>{toast.style.opacity=.25;}));
    });

    /* custom dropdowns */
    document.querySelectorAll('.dd').forEach(dd=>{
      const trig=dd.querySelector('.dd-trigger');
      const txt=dd.querySelector('.dd-text');
      trig.addEventListener('click', e=>{
        e.stopPropagation();
        document.querySelectorAll('.dd.open').forEach(o=>{ if(o!==dd)o.classList.remove('open'); });
        dd.classList.toggle('open');
      });
      dd.querySelectorAll('.dd-opt').forEach(opt=>opt.addEventListener('click',()=>{
        dd.querySelectorAll('.dd-opt').forEach(o=>o.classList.remove('sel'));
        opt.classList.add('sel');
        if(txt) txt.textContent=opt.dataset.val;
        dd.classList.remove('open');
      }));
    });
    document.addEventListener('click',()=>document.querySelectorAll('.dd.open').forEach(o=>o.classList.remove('open')));

    /* error retry → loading → restore */
    document.querySelectorAll('[data-retry]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const orig=btn.innerHTML; btn.disabled=true;
        btn.innerHTML='<span class="ic" style="width:14px;height:14px;display:inline-flex">'+iconSVG('retry')+'</span> \u91cd\u8bd5\u4e2d';
        const sp=btn.querySelector('.ic svg'); if(sp){sp.style.animation='spin 1s linear infinite';}
        setTimeout(()=>{btn.innerHTML=orig; btn.disabled=false;},1500);
      });
    });
  });
})();
