const KEY='orcamentos_app_v1';
const AUTH_KEY='mex_auth_v1';
const SESSION_KEY='mex_session_v1';
const INACTIVITY=20*60*1000;
const PAID_DELETE_DAYS=60;
let paidDeletePromptOpen=false;
let db=JSON.parse(localStorage.getItem(KEY)||'null')||{clientes:[],orcamentos:[],seq:1};
const save=()=>localStorage.setItem(KEY,JSON.stringify(db));
function randomQuoteNumber(used=[]){
 const set=new Set(used.map(String));
 let n;
 do {
   if(window.crypto?.getRandomValues){ const a=new Uint32Array(1); crypto.getRandomValues(a); n=a[0]%1000000; } else n=Math.floor(Math.random()*1000000);
 } while(set.has('M'+String(n).padStart(6,'0')));
 return 'M'+String(n).padStart(6,'0');
}
function normalizeQuoteNumbers(){ const used=[]; (db.orcamentos||[]).forEach(q=>{ q.numero=randomQuoteNumber(used); used.push(q.numero); }); db.seq=1; save(); }
normalizeQuoteNumbers();
const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0).replace(/\u00A0/g,' ');
const $=s=>document.querySelector(s);
let currentScreen='home'; let activeFinanceTab='abertos';
let searchClientes=''; let searchOrcamentos=''; let searchFinanceiro='';
function auth(){return JSON.parse(localStorage.getItem(AUTH_KEY)||'null')||{user:'admin',pass:'1234'}}
function isLogged(){return localStorage.getItem(SESSION_KEY)==='1'}
function login(){ const u=$('#loginUser')?.value.trim(),p=$('#loginPass')?.value; if(u===auth().user&&p===auth().pass){localStorage.setItem(SESSION_KEY,'1');localStorage.removeItem('mex_hidden_at');showApp();} else $('#loginError').textContent='Usuário ou senha inválidos.';}
function logout(){localStorage.removeItem(SESSION_KEY);localStorage.removeItem('mex_hidden_at');$('#sideMenu')?.classList.add('hidden');showLogin()}
function showLogin(){document.body.classList.add('logged-out');$('#loginScreen').classList.remove('hidden');$('#appShell').classList.add('hidden')}
function showApp(){document.body.classList.remove('logged-out');$('#loginScreen').classList.add('hidden');$('#appShell').classList.remove('hidden');go(currentScreen||'home',false)}
function checkInactivity(){ if(!isLogged())return; const h=Number(localStorage.getItem('mex_hidden_at')||0); if(h && Date.now()-h>=INACTIVITY){logout()}}
document.addEventListener('visibilitychange',()=>{ if(document.hidden){if(isLogged())localStorage.setItem('mex_hidden_at',String(Date.now()))} else {checkInactivity();if(isLogged())localStorage.removeItem('mex_hidden_at')}});
setInterval(checkInactivity,30000);
function go(id,doRender=true){currentScreen=id;document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));$('#'+id).classList.add('active');if(doRender)render();window.scrollTo({top:0,behavior:'smooth'});closeMenu()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b){e.preventDefault();go(b.dataset.go)}});
function openModal(title,html){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modal').classList.remove('hidden')}
$('#fecharModal').onclick=()=>$('#modal').classList.add('hidden');
$('#novoCliente').onclick=()=>openCliente();
function onlyDigits(v){return String(v||'').replace(/\D/g,'')}
function maskCpfCnpj(v){ const d=onlyDigits(v).slice(0,14); if(d.length<=11) return d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'); return d.replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2');}
function maskPhone(v){ const d=onlyDigits(v).slice(0,11); if(d.length<=10) return d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d{1,4})$/,'$1-$2'); return d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d{1,4})$/,'$1-$2');}
function maskCep(v){const d=onlyDigits(v).slice(0,8);return d.replace(/(\d{5})(\d{1,3})$/,'$1-$2')}
function openCliente(id=null){
 const c=db.clientes.find(x=>x.id===id)||{};
 openModal(id?'Editar cliente':'Novo cliente',`<form id="clienteForm"><label>Nome*</label><input id="cNome" required value="${escapeAttr(c.nome||'')}"><label>Contato*</label><input id="cContato" required value="${escapeAttr(maskPhone(c.contato||''))}"><label>Endereço</label><input id="cEndereco" value="${escapeAttr(c.endereco||'')}"><label>CEP</label><input id="cCep" inputmode="numeric" value="${escapeAttr(maskCep(c.cep||''))}"><label>CPF/CNPJ</label><input id="cDoc" inputmode="numeric" value="${escapeAttr(maskCpfCnpj(c.doc||''))}"><div class="form-actions"><button type="submit" style="background:#17324d;color:white">Salvar</button></div></form>`);
 $('#cContato').oninput=e=>e.target.value=maskPhone(e.target.value); $('#cCep').oninput=e=>e.target.value=maskCep(e.target.value); $('#cDoc').oninput=e=>e.target.value=maskCpfCnpj(e.target.value);
 $('#clienteForm').onsubmit=e=>{e.preventDefault();const x={id:c.id||crypto.randomUUID(),nome:$('#cNome').value.trim(),contato:maskPhone($('#cContato').value),endereco:$('#cEndereco').value.trim(),cep:maskCep($('#cCep').value),doc:maskCpfCnpj($('#cDoc').value)};if(c.id)db.clientes=db.clientes.map(v=>v.id===c.id?x:v);else db.clientes.push(x);save();$('#modal').classList.add('hidden');render()};
}
function clienteDetalhes(id){ const c=db.clientes.find(x=>x.id===id);if(!c)return; const wa=whatsappUrl(c.contato),tel=telUrl(c.contato); openModal('Dados do cliente',`<div class="client-detail"><h3>${escapeHtml(c.nome)}</h3><div><b>Contato:</b> ${escapeHtml(c.contato||'-')}</div><div><b>Endereço:</b> ${escapeHtml(c.endereco||'-')}</div><div><b>CEP:</b> ${escapeHtml(c.cep||'-')}</div><div><b>CPF/CNPJ:</b> ${escapeHtml(c.doc||'-')}</div><div class="contact-actions">${c.contato?`<a class="contact-btn whatsapp" href="${wa}" target="_blank" rel="noopener">💬 WhatsApp</a><a class="contact-btn call" href="${tel}">☎ Chamada</a>`:''}</div><div class="form-actions"><button onclick="openCliente('${id}')">✎ Editar</button><button class="danger" onclick="delCliente('${id}')">🗑 Excluir</button></div></div>`);}
function delCliente(id){ const c=db.clientes.find(x=>x.id===id);if(!c)return; if(confirm(`Excluir o cliente ${c.nome}?`)){db.clientes=db.clientes.filter(x=>x.id!==id);save();$('#modal').classList.add('hidden');render()}}

function quoteTotal(q){return(q.items||[]).reduce((s,x)=>s+(Number(x.qtd)||0)*(Number(x.uni)||0),0)}
function normalizeFinance(q){
 if(!q.movimentos){
   const f=q.financeiro;
   q.movimentos=f&&Number(f.recebido)>0?[{id:crypto.randomUUID(),data:f.data||q.data,metodo:f.metodo||'Não informado',parcelas:Number(f.parcelas)||1,valor:Number(f.recebido)||0}]:[];
 }
 return q.movimentos||[];
}
function received(q){return normalizeFinance(q).reduce((s,m)=>s+(Number(m.valor)||0),0)}
function paymentPercent(q){const total=quoteTotal(q);return total?Math.min(100,(received(q)/total)*100):0}
function isPaid(q){return paymentPercent(q)>=100;}
function clienteTemDebito(id){
  return db.orcamentos.some(q => q.clienteId===id && (q.status==='aprovado' || q.status==='concluido') && paymentPercent(q) < 100);
}
function renderClientes(){
  const term=searchClientes.trim().toLocaleLowerCase('pt-BR');
  const clientes=db.clientes.filter(c=>!term || [c.nome,c.contato,c.doc,c.cep,c.endereco].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(term)));
  $('#clientesLista').innerHTML=clientes.map(c=>{
    const classe = clienteTemDebito(c.id)? ' cli-vermelho' : '';
    return `<div class="list-card client-card${classe}" onclick="clienteDetalhes('${c.id}')"><div class="client-info"><b>${escapeHtml(c.nome)}</b><a class="meta contact-link" href="${telUrl(c.contato)}" onclick="event.stopPropagation()">${escapeHtml(c.contato)}</a></div><div class="actions client-actions" onclick="event.stopPropagation()"><button class="quote-icon" onclick="openCliente('${c.id}')">✎</button><button class="quote-icon danger-icon" onclick="delCliente('${c.id}')">🗑</button></div><button class="novo-orcamento-client" onclick="event.stopPropagation();novoOrc('${c.id}')">+ Novo orçamento</button></div>`
  }).join('')||'<div class="list-card">Nenhum cliente encontrado.</div>'
}

function novoOrc(clienteId=null,id=null){
 const q=db.orcamentos.find(x=>x.id===id)||{clienteId:clienteId||'',items:[],validade:15,status:'pendente'};
 if(id && !['pendente','aprovado','cancelado','vencido'].includes(q.status)){openModal('Aviso','<p>Este orçamento não pode ser editado neste momento.</p>');return}
 openModal(id?'Editar orçamento':'Novo orçamento',`<form id="orcForm"><label>Cliente*</label><select id="qCliente" required><option value="">Selecione</option>${db.clientes.map(c=>`<option value="${c.id}" ${c.id===q.clienteId?'selected':''}>${escapeHtml(c.nome)}</option>`).join('')}</select><label>Validade (dias)</label><input id="qValidade" type="number" min="1" value="${q.validade||15}"><div id="itens"></div><button type="button" class="secondary" id="addItem">+ Adicionar item</button><div class="form-actions quote-save-actions"><button type="submit" style="background:#17324d;color:white">Salvar orçamento</button>${['pendente'].includes(q.status)?'<button type="button" id="saveShare" class="share-save">↗ Salvar e compartilhar</button>':''}</div></form>`);
 let items=[...(q.items||[])];
 const paint=()=>{
   $('#itens').innerHTML=items.map((it,i)=>`<div class="list-card item-row-card" style="margin:10px 0"><div class="item-row-head"><b>Item ${i+1}</b><button type="button" class="quote-icon danger-icon" onclick="removeItem(${i})" title="Excluir item">✕</button></div><label>Nome*</label><input class="in" data-k="nome" data-i="${i}" value="${escapeAttr(it.nome||'')}"><label>Descrição*</label><textarea class="in" data-k="desc" data-i="${i}">${escapeHtml(it.desc||'')}</textarea><div class="item-fields"><div><label>QTD*</label><input class="in" data-k="qtd" data-i="${i}" type="number" min="0" step="0.01" value="${it.qtd??1}"></div><div><label>Valor unitário*</label><input class="in" data-k="uni" data-i="${i}" type="number" min="0" step="0.01" value="${it.uni??0}"></div></div><div class="meta">Total: <b class="item-total">${money((it.qtd||0)*(it.uni||0))}</b></div></div>`).join('');
 };
 window.removeItem = (idx)=>{ items.splice(idx,1); paint(); };
 window.openItemModal=()=>{
   const overlay=document.createElement('div'); overlay.className='item-modal-overlay'; overlay.id='itemModalOverlay';
   overlay.innerHTML=`<div class="item-modal-box"><div class="item-modal-head"><h3>Inserir item</h3></div><div class="item-modal-body"><label>Nome*</label><input id="newItemNome" autofocus><label>Descrição*</label><textarea id="newItemDesc"></textarea><div class="item-fields"><div><label>QTD*</label><input id="newItemQtd" type="number" min="0" step="0.01" value="1"></div><div><label>Valor unitário*</label><input id="newItemUni" type="number" min="0" step="0.01" value="0"></div></div><div class="form-actions"><button type="button" class="secondary" id="itemCancel">Cancelar</button><button type="button" class="primary" id="itemAdd">Adicionar</button></div></div></div>`;
   document.body.appendChild(overlay);
   const close=()=>overlay.remove(); $('#itemCancel').onclick=close;
   $('#itemAdd').onclick=()=>{const nome=$('#newItemNome').value.trim(),desc=$('#newItemDesc').value.trim(),qtd=Number($('#newItemQtd').value),uni=Number($('#newItemUni').value);if(!nome||!desc||!qtd||qtd<0||uni<0){alert('Preencha todos os campos obrigatórios do item.');return}items.push({qtd,uni,nome,desc});close();paint()};
   overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 };
 paint();
 $('#addItem').onclick=()=>openItemModal();
 $('#orcForm').oninput=e=>{if(e.target.classList.contains('in')){const i=Number(e.target.dataset.i),k=e.target.dataset.k;if(items[i])items[i][k]=e.target.value;const t=e.target.closest('.item-row-card')?.querySelector('.item-total');if(t)t.textContent=money((Number(items[i].qtd)||0)*(Number(items[i].uni)||0))}};
 const saveQuote=(shareAfter=false)=>{
   if(!items.length||items.some(x=>!String(x.nome||'').trim()||!String(x.desc||'').trim()||!x.qtd||x.uni==='')){alert('Preencha todos os campos obrigatórios dos itens.');return}
   if(!$('#qCliente').value){alert('Selecione o cliente.');return}
   const now=new Date();
   const novoStatus=q.id&&['aprovado','cancelado','vencido'].includes(q.status)?'pendente':(q.status||'pendente');
   const x={...q,id:q.id||crypto.randomUUID(),numero:q.numero||randomQuoteNumber(db.orcamentos.map(v=>v.numero)),clienteId:$('#qCliente').value,validade:Number($('#qValidade').value)||15,data:q.data||now.toISOString(),items:items.map((it,i)=>({...it,item:i+1,nome:String(it.nome).trim(),desc:String(it.desc).trim(),qtd:Number(it.qtd),uni:Number(it.uni)})),status:novoStatus};
   if(q.id)db.orcamentos=db.orcamentos.map(v=>v.id===q.id?x:v);else db.orcamentos.push(x);save();$('#modal').classList.add('hidden');render();if(shareAfter)compartilharOrcamento(x.id)
 };
 $('#orcForm').onsubmit=e=>{e.preventDefault();saveQuote(false)};
 if($('#saveShare'))$('#saveShare').onclick=()=>saveQuote(true);
}

function paidWatermark(q){return isPaid(q)?'<div class="paid-watermark">PAGO</div>':''}
function renderOrcamentos(filter='todos'){
 const term=searchOrcamentos.trim().toLocaleLowerCase('pt-BR');
 const list=db.orcamentos.filter(q=>{if(filter!=='todos'&&q.status!==filter)return false; if(!term)return true; const c=db.clientes.find(x=>x.id===q.clienteId); return [q.numero,c?.nome,c?.contato,q.status].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(term));}).sort((a,b)=>b.data.localeCompare(a.data));
 $('#orcamentosLista').innerHTML=list.map(q=>{
   const c=db.clientes.find(x=>x.id===q.clienteId),total=quoteTotal(q),contato=String(c?.contato||'');
   const itens=(q.items||[]).map((it,i)=>`<div class="quote-item"><b>${escapeHtml(i+1+'. '+it.nome)}</b><div>${escapeHtml(it.desc)}</div><small>Qtd: ${it.qtd} • Unit.: ${money(it.uni)} • Total: ${money((it.qtd||0)*(it.uni||0))}</small></div>`).join('');
   const paidDeleteAction=isPaid(q)&&q.pagoExclusaoLiberada?`<button class="quote-icon danger-icon" onclick="delQ('${q.id}')">🗑</button>`:'';
   const actions=q.status==='pendente'?`<button class="quote-icon" onclick="novoOrc(null,'${q.id}')">✎</button><button class="quote-icon" onclick="statusQ('${q.id}','aprovado')">✓</button><button class="quote-icon" onclick="statusQ('${q.id}','cancelado')">🔒</button>`:q.status==='cancelado'?`<button class="quote-icon" onclick="statusQ('${q.id}','pendente')">✎</button><button class="quote-icon" onclick="delQ('${q.id}')">🗑</button>`:q.status==='aprovado'?`<button class="quote-icon" onclick="novoOrc(null,'${q.id}')">✎</button><button class="quote-icon" onclick="statusQ('${q.id}','cancelado')">🔒</button><button class="quote-icon" onclick="statusQ('${q.id}','concluido')">✓</button>`:q.status==='vencido'?`<button class="quote-icon" onclick="statusQ('${q.id}','pendente')">✎</button><button class="quote-icon" onclick="delQ('${q.id}')">🗑</button>`:paidDeleteAction;
   const detailShare=q.status==='pendente'?`<button class="share-detail" onclick="compartilharOrcamento('${q.id}')">↗ Compartilhar PDF</button>`:'';
   return `<div class="list-card ${q.status} quote-card ${isPaid(q)?'is-paid':''}" onclick="toggleQuoteDetail('${q.id}')">${paidWatermark(q)}<b>Orçamento Nº ${q.numero}</b><div class="meta">${escapeHtml(c?.nome||'Cliente não informado')} • ${new Date(q.data).toLocaleDateString('pt-BR')}</div><div class="quote-actions" onclick="event.stopPropagation()">${contato?`<a class="quote-contact" href="${whatsappUrl(contato)}" target="_blank">${escapeHtml(contato)}</a>`:''}<span class="spacer"></span>${actions}</div><div class="quote-detail hidden" id="detail-${q.id}"><div class="meta"><b>Cliente:</b> ${escapeHtml(c?.nome||'')}<br><b>Contato:</b> ${escapeHtml(c?.contato||'')}<br><b>Validade:</b> ${q.validade||15} dias</div><div class="quote-items">${itens||'<div class="meta">Nenhum item.</div>'}</div><div class="quote-total"><b>Total: ${money(total)}</b></div>${detailShare}</div></div>`
 }).join('')||'<div class="list-card">Nenhum orçamento encontrado.</div>';
 schedulePaidDeletionPrompt();
}
function paidAgeDays(q){ const t=new Date(q.data).getTime(); return Number.isFinite(t)?Math.floor((Date.now()-t)/86400000):0; }
function schedulePaidDeletionPrompt(){ if(paidDeletePromptOpen)return; const q=db.orcamentos.find(x=>isPaid(x)&&paidAgeDays(x)>=PAID_DELETE_DAYS&&!x.pagoExclusaoRespondida); if(!q)return; setTimeout(()=>promptPaidDeletion(q.id),120);}
function promptPaidDeletion(id){ if(paidDeletePromptOpen)return; const q=db.orcamentos.find(x=>x.id===id); if(!q||!isPaid(q)||paidAgeDays(q)<PAID_DELETE_DAYS||q.pagoExclusaoRespondida)return; paidDeletePromptOpen=true; const c=db.clientes.find(x=>x.id===q.clienteId); openModal('Orçamento pago há mais de 60 dias',`<div class="paid-delete-prompt"><p>O orçamento <b>${escapeHtml(q.numero)}</b>${c?.nome?` do cliente <b>${escapeHtml(c.nome)}</b>`:''} está quitado há mais de 60 dias.</p><p>Deseja excluir?</p><div class="form-actions"><button id="paidDeleteNo">Não</button><button id="paidDeleteYes" class="danger">Sim, excluir</button></div></div>`); $('#paidDeleteNo').onclick=()=>{q.pagoExclusaoRespondida=true;q.pagoExclusaoLiberada=true;save();paidDeletePromptOpen=false;$('#modal').classList.add('hidden');renderOrcamentos()}; $('#paidDeleteYes').onclick=()=>{paidDeletePromptOpen=false;$('#modal').classList.add('hidden');db.orcamentos=db.orcamentos.filter(x=>x.id!==id);save();render()}; }
function statusQ(id,s){const q=db.orcamentos.find(x=>x.id===id);if(q){q.status=s;save();render()}}
function delQ(id){if(confirm('Excluir este orçamento?')){db.orcamentos=db.orcamentos.filter(x=>x.id!==id);save();render()}}
function financeClass(p){return p>=100?'pay100':p>=67?'pay67':p>33?'pay34':'pay33'}
function renderFinanceiro(){ const term=searchFinanceiro.trim().toLocaleLowerCase('pt-BR'); const all=db.orcamentos.filter(q=>q.status==='aprovado'||q.status==='concluido'); const filtered=all.filter(q=>{if(!term)return true;const c=db.clientes.find(x=>x.id===q.clienteId);return [q.numero,c?.nome,c?.contato].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(term));}); const qs=activeFinanceTab==='finalizados'?filtered.filter(q=>paymentPercent(q)>=100):activeFinanceTab==='relatorio'?filtered:filtered.filter(q=>paymentPercent(q)<100); $('#financeiroLista').innerHTML=qs.map(q=>{const c=db.clientes.find(x=>x.id===q.clienteId);return `<div class="list-card finance-card ${financeClass(paymentPercent(q))}" onclick="financeiro('${q.id}')"><b>Orçamento Nº ${q.numero}</b><div class="meta">${escapeHtml(c?.nome||'')}</div><a class="whatsapp" href="${whatsappUrl(c?.contato||'')}" onclick="event.stopPropagation()">${escapeHtml(c?.contato||'')}</a></div>`}).join('')||'<div class="list-card">Nenhum orçamento nesta categoria.</div>'}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{activeFinanceTab=b.dataset.tab;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));renderFinanceiro()});
function financeiro(id){
 const q=db.orcamentos.find(x=>x.id===id);if(!q)return;const c=db.clientes.find(x=>x.id===q.clienteId),total=quoteTotal(q),mov=normalizeFinance(q),rec=received(q),rest=Math.max(0,total-rec);
 const history=mov.slice().sort((a,b)=>new Date(b.data)-new Date(a.data)).map(m=>`<div class="movement"><div><b>${escapeHtml(m.metodo)}</b><small>${new Date(m.data).toLocaleDateString('pt-BR')}${m.parcelas>1?' • '+m.parcelas+' parcelas':''}</small></div><strong>${money(m.valor)}</strong></div>`).join('')||'<div class="meta">Nenhuma movimentação.</div>';
 openModal(`Financeiro • Nº ${q.numero}`,`<p><b>${escapeHtml(c?.nome||'')}</b><br><a class="whatsapp" href="${whatsappUrl(c?.contato||'')}" target="_blank">${escapeHtml(c?.contato||'')}</a></p><p>Total: <b>${money(total)}</b><br>Recebido: <b>${money(rec)}</b><br>Falta: <b>${money(rest)}</b></p><h3>Histórico</h3><div class="movement-list">${history}</div>${rest>0?`<button class="primary add-movement" id="addMovement">+ Adicionar movimentação</button>`:'<div class="paid-badge">Pagamento quitado</div>'}`);
 if($('#addMovement'))$('#addMovement').onclick=()=>addMovimento(q.id);
}
function addMovimento(id){
 const q=db.orcamentos.find(x=>x.id===id);if(!q)return;const total=quoteTotal(q),rest=Math.max(0,total-received(q));
 openModal('Adicionar movimentação',`<form id="movForm"><p>Falta receber: <b>${money(rest)}</b></p><label>Data</label><input id="movData" type="date" value="${new Date().toISOString().slice(0,10)}"><label>Forma</label><select id="movPay"><option value="">Selecione</option><option>PIX</option><option>Espécie</option><option>Débito</option><option>Crédito à vista</option><option>Crédito parcelado</option></select><label>Parcelas</label><input id="movParc" type="number" min="1" value="1"><label>Valor</label><input id="movValor" type="number" min="0.01" max="${rest}" step="0.01" required><div class="form-actions"><button type="submit" style="background:#17324d;color:white">Adicionar</button></div></form>`);
 $('#movForm').onsubmit=e=>{e.preventDefault();const valor=Number($('#movValor').value)||0;if(!$('#movPay').value||valor<=0||valor>rest){alert('Informe forma e valor válido.');return}normalizeFinance(q).push({id:crypto.randomUUID(),data:new Date($('#movData').value+'T12:00:00').toISOString(),metodo:$('#movPay').value,parcelas:Number($('#movParc').value)||1,valor});if(received(q)>=total)q.status='concluido';save();$('#modal').classList.add('hidden');render()}
}
function toggleQuoteDetail(id){const el=document.getElementById('detail-'+id);if(el)el.classList.toggle('hidden')}
function whatsappUrl(v){const d=String(v||'').replace(/\D/g,'');return d?`https://wa.me/${d}`:'#'}
function telUrl(v){const d=String(v||'').replace(/\D/g,'');return d?`tel:${d}`:'#'}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function escapeAttr(v){return escapeHtml(v)}
function firstName(name){return String(name||'Cliente').trim().split(/\s+/)[0]||'Cliente'}
function pdfEscape(v){return String(v??'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function pdfTextSafe(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\u0000-\u001F\u00A0]/g,' ').replace(/[^\x20-\x7E]/g,' ')}
function wrapPdfText(text,max){const words=pdfTextSafe(text).trim().split(/\s+/).filter(Boolean),lines=[];let line='';words.forEach(w=>{const t=(line+' '+w).trim();if(t.length>max){if(line)lines.push(line);line=w}else line=t});if(line)lines.push(line);return lines}
function pdfBytes(s){const out=new Uint8Array(s.length);for(let i=0;i<s.length;i++)out[i]=s.charCodeAt(i)&255;return out}
function pdfConcat(arrays){let n=0;arrays.forEach(a=>n+=a.length);const out=new Uint8Array(n);let o=0;arrays.forEach(a=>{out.set(a,o);o+=a.length});return out}
const HELV_WIDTHS={A:.667,B:.667,C:.722,D:.722,E:.667,F:.611,G:.778,H:.722,I:.278,J:.5,K:.667,L:.556,M:.833,N:.722,O:.778,P:.667,Q:.778,R:.722,S:.667,T:.611,U:.722,V:.667,W:.944,X:.667,Y:.667,Z:.611,a:.556,b:.556,c:.5,d:.556,e:.556,f:.278,g:.556,h:.556,i:.222,j:.222,k:.5,l:.222,m:.833,n:.556,o:.556,p:.556,q:.556,r:.333,s:.5,t:.278,u:.556,v:.5,w:.722,x:.5,y:.5,z:.5,'0':.556,'1':.556,'2':.556,'3':.556,'4':.556,'5':.556,'6':.556,'7':.556,'8':.556,'9':.556,' ':.278,':':.278,'/':.278,'-':.333,'.':.278};
const HELV_BOLD_WIDTHS={A:.722,B:.722,C:.722,D:.722,E:.667,F:.611,G:.778,H:.722,I:.278,J:.556,K:.722,L:.611,M:.833,N:.722,O:.778,P:.667,Q:.778,R:.722,S:.667,T:.611,U:.722,V:.667,W:.944,X:.667,Y:.667,Z:.611,a:.556,b:.611,c:.556,d:.611,e:.556,f:.333,g:.611,h:.611,i:.278,j:.278,k:.556,l:.278,m:.889,n:.611,o:.611,p:.611,q:.611,r:.389,s:.556,t:.333,u:.611,v:.556,w:.778,x:.556,y:.556,z:.5,'0':.556,'1':.556,'2':.556,'3':.556,'4':.556,'5':.556,'6':.556,'7':.556,'8':.556,'9':.556,' ':.278,':':.333,'/':.278,'-':.333,'.':.278};
function pdfTextWidthApprox(v,size=9,bold=false){const map=bold?HELV_BOLD_WIDTHS:HELV_WIDTHS;return [...pdfTextSafe(v)].reduce((n,ch)=>n+(map[ch]||.5),0)*size}
function pdfRightX(v,right,size=9,bold=false){return Math.max(0,right-pdfTextWidthApprox(v,size,bold))}
async function loadPdfImage(path){
  if(location.protocol==='file:') throw new Error('Abra pelo bat');
  const res=await fetch(new URL(path, document.baseURI).href,{cache:'no-store'});
  if(!res.ok) throw new Error('Sem '+path);
  const bytes=new Uint8Array(await res.arrayBuffer());
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let pos=8,w=0,h=0,bitDepth=0,colorType=0; let idat=[];
  while(pos+8<=bytes.length){
    const len=dv.getUint32(pos); pos+=4;
    const type=String.fromCharCode(bytes[pos],bytes[pos+1],bytes[pos+2],bytes[pos+3]); pos+=4;
    if(pos+len+4>bytes.length) break;
    const data=bytes.subarray(pos,pos+len); pos+=len+4;
    if(type==='IHDR'){ w=dv.getUint32(data.byteOffset); h=dv.getUint32(data.byteOffset+4); bitDepth=data[8]; colorType=data[9]; }
    else if(type==='IDAT') idat.push(data);
    else if(type==='IEND') break;
  }
  if(bitDepth!==8||colorType!==6) throw new Error('PNG precisa RGBA 8-bit');
  const comp=new Uint8Array(idat.reduce((n,a)=>n+a.length,0)); let at=0; for(const a of idat){comp.set(a,at);at+=a.length;}
  const raw=new Uint8Array(await new Response(new Blob([comp]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
  const stride=w*4, rgba=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++){ const srcRow=y*(stride+1), filter=raw[srcRow]; const row=srcRow+1, out=y*stride, prev=(y-1)*stride;
    for(let x=0;x<stride;x++){ const a=x>=4?rgba[out+x-4]:0; const b=y>0?rgba[prev+x]:0; const c=(y>0&&x>=4)?rgba[prev+x-4]:0; const v=raw[row+x]; let z;
      if(filter===0) z=v; else if(filter===1) z=(v+a)&255; else if(filter===2) z=(v+b)&255; else if(filter===3) z=(v+Math.floor((a+b)/2))&255;
      else { const p=a+b-c, pr= Math.abs(p-a)<=Math.abs(p-b)&&Math.abs(p-a)<=Math.abs(p-c)?a:(Math.abs(p-b)<=Math.abs(p-c)?b:c); z=(v+pr)&255; }
      rgba[out+x]=z; } }
  const rgb=new Uint8Array(w*h*3), alpha=new Uint8Array(w*h);
  let ri=0,ai=0; for(let i=0;i<rgba.length;i+=4){rgb[ri++]=rgba[i];rgb[ri++]=rgba[i+1];rgb[ri++]=rgba[i+2];alpha[ai++]=rgba[i+3];}
  const deflate=async b=>{ const cs=new CompressionStream('deflate'); return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(cs)).arrayBuffer()); };
  return {w,h,rgb:await deflate(rgb),alpha:await deflate(alpha)};
}
async function gerarPdfOrcamento(q){
 const c=db.clientes.find(x=>x.id===q.clienteId)||{};
 const total=quoteTotal(q), dataStr=new Date(q.data||Date.now()).toLocaleDateString('pt-BR'), validade=Number(q.validade)||15;
 let logo=null, zap=null;
 try{ logo=await loadPdfImage('logo.png'); }catch(e){}
 try{ zap=await loadPdfImage('zap.png'); }catch(e){}
 const content=[];
 const text=(s,x,y,size=9,bold=false)=>content.push(`BT /${bold?'F2':'F1'} ${size} Tf 0 g ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(pdfTextSafe(s))}) Tj ET`);
 const line=(x1,y1,x2,y2)=>content.push(`0.82 G 0.65 w ${x1} ${y1} m ${x2} ${y2} l S`);
 const rect=(x,y,w,h,fill='0.92')=>content.push(`${fill} g ${x} ${y} ${w} ${h} re f 0.82 G 0.65 w ${x} ${y} ${w} ${h} re S`);
 const img=(name,w,h,x,y)=>content.push(`q ${w} 0 0 ${h} ${x} ${y} cm /${name} Do Q`);
 const companyX=190;
 try{ if(logo) img('Logo',110,45,30,771); }catch(e){}
 line(175,775,175,820); line(430,775,430,820);
 text('Rua Nova, 6760 Pedra Mole',companyX,807,8.5);
 text('CEP: 64065-000',companyX,794,8.5);
 text('CNPJ: 59.687.966/0001-91',companyX,781,8.5);
 const companyContact='(86) 98813-6559';
 text(companyContact,companyX,768,8.5);
 if(zap){ const wContact=pdfTextWidthApprox(companyContact,8.5,false); img('Zap',11,11,companyX+wContact+3,766.5); }
 text('ORCAMENTO/PEDIDO',pdfRightX('ORCAMENTO/PEDIDO',565,9.5,true),807,9.5,true);
 text('N: '+q.numero,pdfRightX('N: '+q.numero,565,8.5,true),793,8.5,true);
 text('Emissao: '+dataStr,pdfRightX('Emissao: '+dataStr,565,8.5,false),779,8.5,false);
 text('Validade: '+validade+' dias',pdfRightX('Validade: '+validade+' dias',565,8.5,false),765,8.5,false);
 line(30,748,565,748);
 text('Destinatario/ Cliente:',30,731,9.5,true);
 let y=720;
 const l1='Nome/ Razao Social: '; text(l1,30,y,8.5,false); text(c.nome||'-',30+pdfTextWidthApprox(l1,8.5,false),y,8.5,true); y-=10;
 const l2='CPF/ CNPJ: '; text(l2,30,y,8.5,false); text(maskCpfCnpj(c.doc||'-'),30+pdfTextWidthApprox(l2,8.5,false),y,8.5,true); y-=10;
 const l3='Endereco (Opcional): '; text(l3,30,y,8.5,false); text(c.endereco||'-',30+pdfTextWidthApprox(l3,8.5,false),y,8.5,true); y-=10;
 const l4='Telefone/ Contato: '; text(l4,30,y,8.5,false); text(maskPhone(c.contato||'-'),30+pdfTextWidthApprox(l4,8.5,false),y,8.5,true);
 line(30,678,565,678); rect(30,623,535,17);
 text('ITEM',36,628,8.2,true); text('DESCRICAO',75,628,8.2,true); text('QTD',370,628,8.2,true); text('VALOR UNI',425,628,8.2,true); text('VALOR TOTAL',495,628,8.2,true);
 let rowTop=623;
 (q.items||[]).forEach((it,i)=>{ const bottom=rowTop-36; line(30,bottom,565,bottom); text(String(i+1),35,rowTop-14,8.8,true); text(pdfTextSafe(it.nome||''),75,rowTop-14,8.8,true); wrapPdfText(it.desc||'',60).slice(0,2).forEach((d,k)=>text(d,75,rowTop-22-k*7,8.1)); text(String(it.qtd??0),370,rowTop-14,8.8); text(money(it.uni),425,rowTop-14,8.8); text(money((Number(it.qtd)||0)*(Number(it.uni)||0)),495,rowTop-14,8.8); rowTop=bottom; });
 rect(30,47,330,33); rect(370,47,195,33);
 text('Proposta sujeita a aprovacao.',40,69,7.5); text('Garantia de fabrica conforme contrato.',40,56,7.5);
 text('VALOR TOTAL',380,69,8,true); text(money(total),380,52,13.5,true);
 if(String(q.status||'').toLowerCase()==='concluido' && isPaid(q)){ text('PAGO',230,350,86,true); }
 const streamBytes=pdfBytes(content.join('\n'));
 let objs={}, objData={}, nextId=1;
 const catalogId=nextId++, pagesId=nextId++, pageId=nextId++, contentId=nextId++, font1Id=nextId++, font2Id=nextId++;
 let logoRgbId=null, logoAlphaId=null, zapRgbId=null, zapAlphaId=null;
 if(logo){ logoRgbId=nextId++; logoAlphaId=nextId++; }
 if(zap){ zapRgbId=nextId++; zapAlphaId=nextId++; }
 objs[catalogId]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
 objs[pagesId]=`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`;
 let xobjDict=''; if(logoRgbId) xobjDict+=`/Logo ${logoRgbId} 0 R `; if(zapRgbId) xobjDict+=`/Zap ${zapRgbId} 0 R `;
 objs[pageId]=`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >> ${xobjDict?`/XObject << ${xobjDict.trim()} >>`:''} >> /Contents ${contentId} 0 R >>`;
 objs[contentId]=`<< /Length ${streamBytes.length} >>`; objData[contentId]=streamBytes;
 objs[font1Id]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
 objs[font2Id]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
 if(logo){ objs[logoRgbId]=`<< /Type /XObject /Subtype /Image /Width ${logo.w} /Height ${logo.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask ${logoAlphaId} 0 R /Length ${logo.rgb.length} >>`; objData[logoRgbId]=logo.rgb; objs[logoAlphaId]=`<< /Type /XObject /Subtype /Image /Width ${logo.w} /Height ${logo.h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${logo.alpha.length} >>`; objData[logoAlphaId]=logo.alpha; }
 if(zap){ objs[zapRgbId]=`<< /Type /XObject /Subtype /Image /Width ${zap.w} /Height ${zap.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask ${zapAlphaId} 0 R /Length ${zap.rgb.length} >>`; objData[zapRgbId]=zap.rgb; objs[zapAlphaId]=`<< /Type /XObject /Subtype /Image /Width ${zap.w} /Height ${zap.h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${zap.alpha.length} >>`; objData[zapAlphaId]=zap.alpha; }
 let finalParts=[], finalOffsets={}; const header=pdfBytes('%PDF-1.4\n'); finalParts.push(header); let cur=header.length; const totalObjs=nextId-1;
 for(let i=1;i<=totalObjs;i++){ finalOffsets[i]=cur; let b; if(objData[i]){ b=pdfConcat([pdfBytes(i+' 0 obj\n'+objs[i]+'\nstream\n'), objData[i], pdfBytes('\nendstream\nendobj\n')]); }else{ b=pdfBytes(i+' 0 obj\n'+objs[i]+'\nendobj\n'); } finalParts.push(b); cur+=b.length; }
 const xrefPos=cur; let xref=`xref\n0 ${totalObjs+1}\n0000000000 65535 f \n`; for(let i=1;i<=totalObjs;i++){ xref+=String(finalOffsets[i]).padStart(10,'0')+' 00000 n \n'; } xref+=`trailer\n<< /Size ${totalObjs+1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`; finalParts.push(pdfBytes(xref));
 return new Blob(finalParts,{type:'application/pdf'});
}
async function compartilharOrcamento(id){
 try{
   const q=db.orcamentos.find(x=>x.id===id); if(!q) throw new Error('Orcamento nao encontrado');
   const c=db.clientes.find(x=>x.id===q.clienteId)||{}; const blob=await gerarPdfOrcamento(q);
   const nomeSafe=`Orcamento_${q.numero}_${firstName(c.nome).replace(/[^A-Za-z0-9]/g,'')}.pdf`;
   const file=new File([blob],nomeSafe,{type:'application/pdf'});
   if(navigator.canShare && navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file], title:nomeSafe}); return; }catch(e){ if(e.name==='AbortError') return; } }
   const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=nomeSafe; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),8000);
 }catch(e){ console.error(e); alert('Erro PDF: '+(e.message||e)); }
}
async function forgotPassword(){
 const a=auth();
 const user=String(a.user||'');
 const pass=String(a.pass||'');
 try{
   const content=`BT /F2 16 Tf 0 g 50 780 Td (Metalurgica Xavier) Tj ET\nBT /F2 13 Tf 0 g 50 740 Td (Recuperacao de acesso) Tj ET\nBT /F1 11 Tf 0 g 50 705 Td (Usuario: ${pdfEscape(pdfTextSafe(user))}) Tj ET\nBT /F1 11 Tf 0 g 50 680 Td (Senha: ${pdfEscape(pdfTextSafe(pass))}) Tj ET\nBT /F1 10 Tf 0 g 50 635 Td (Senha para desbloqueio: M@ki0110) Tj ET`;
   const stream=pdfBytes(content); const objs={}; let next=1;
   const catalog=next++,pages=next++,page=next++,cont=next++,f1=next++,f2=next++;
   objs[catalog]=`<< /Type /Catalog /Pages ${pages} 0 R >>`;
   objs[pages]=`<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`;
   objs[page]=`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cont} 0 R >>`;
   objs[cont]=`<< /Length ${stream.length} >>`;
   objs[f1]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
   objs[f2]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
   let parts=[pdfBytes('%PDF-1.4\\n')], offsets={}, cur=parts[0].length;
   for(let i=1;i<next;i++){offsets[i]=cur;const b=objData=i===cont?pdfConcat([pdfBytes(i+' 0 obj\\n'+objs[i]+'\\nstream\\n'),stream,pdfBytes('\\nendstream\\nendobj\\n')]):pdfBytes(i+' 0 obj\\n'+objs[i]+'\\nendobj\\n');parts.push(b);cur+=b.length;}
   let xrefPos=cur;let xref=`xref\\n0 ${next}\\n0000000000 65535 f \\n`;for(let i=1;i<next;i++)xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \\n';xref+=`trailer\\n<< /Size ${next} /Root ${catalog} 0 R >>\\nstartxref\\n${xrefPos}\\n%%EOF`;parts.push(pdfBytes(xref));
   const blob=new Blob(parts,{type:'application/pdf'});
   const file=new File([blob],'Recuperacao_MeX.pdf',{type:'application/pdf'});
   const wa='https://wa.me/5586999080211?text='+encodeURIComponent('Olá, preciso recuperar meu acesso ao MeX. Estou enviando o PDF com os dados de acesso.');
   if(navigator.canShare && navigator.canShare({files:[file]})){
     try{await navigator.share({files:[file],title:'Recuperação de acesso MeX',text:'PDF de recuperação de acesso'});return;}catch(e){if(e.name==='AbortError')return;}
   }
   const url=URL.createObjectURL(blob);const aEl=document.createElement('a');aEl.href=url;aEl.download='Recuperacao_MeX.pdf';document.body.appendChild(aEl);aEl.click();aEl.remove();setTimeout(()=>URL.revokeObjectURL(url),8000);
   window.open(wa,'_blank','noopener');
 }catch(e){console.error(e);alert('Não foi possível gerar o PDF de recuperação.');}
}

function closeMenu(){$('#sideMenu')?.classList.add('hidden')}
$('#menuBtn').onclick=()=>$('#sideMenu').classList.toggle('hidden');
$('#menuClose').onclick=closeMenu;
$('#menuUser').onclick=()=>{closeMenu();openUserSettings()};
$('#menuLogout').onclick=logout;
$('#menuSettings').onclick=()=>{closeMenu();openSettings()};
function openUserSettings(){ const a=auth(); openModal('Usuário',`<form id="userForm"><label>Usuario</label><input id="userName" value="${escapeAttr(a.user||'')}" required><label>Senha atual</label><input id="currentPass" type="password" required><label>Nova senha</label><input id="newPass" type="password"><label>Confirmar</label><input id="newPass2" type="password"><div class="form-actions"><button type="submit" style="background:#17324d;color:white">Salvar</button></div></form>`); $('#userForm').onsubmit=e=>{ e.preventDefault(); const current=$('#currentPass').value; const name=$('#userName').value.trim(); const np=$('#newPass').value; const np2=$('#newPass2').value; if(current!==a.pass){alert('Senha atual invalida.');return} if(!name){alert('Informe usuario.');return} if((np||np2)&&np!==np2){alert('Confirmacao nao confere.');return} localStorage.setItem(AUTH_KEY,JSON.stringify({user:name,pass:np||a.pass})); $('#modal').classList.add('hidden'); alert('Atualizado.'); }; }
function openSettings(){ openModal('Ajustes',`<label>Tema</label><div class="theme-options"><button data-theme="claro">Claro</button><button data-theme="medio">Médio</button><button data-theme="escuro">Escuro</button></div><label>Fonte</label><input id="fontRange" type="range" min="90" max="125" step="5" value="${Number(localStorage.getItem('mex_font')||100)}"><div class="font-preview" id="fontPreview">Tamanho atual da fonte</div>`); document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>setTheme(b.dataset.theme));$('#fontRange').oninput=e=>setFont(Number(e.target.value));}
function setTheme(t){document.body.dataset.theme=t;localStorage.setItem('mex_theme',t)}
function setFont(v){document.documentElement.style.setProperty('--font-scale',(v/100).toFixed(2));localStorage.setItem('mex_font',v);if($('#fontPreview'))$('#fontPreview').textContent=`Tamanho atual: ${v}%`}
function loadPreferences(){setTheme(localStorage.getItem('mex_theme')||'claro');setFont(Number(localStorage.getItem('mex_font')||100))}
$('#forgotPassword')?.addEventListener('click',forgotPassword);
$('#loginForm').onsubmit=e=>{e.preventDefault();login()};
$('#loginPass').onkeydown=e=>{if(e.key==='Enter')login()};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{$('#filtros').classList.add('hidden');renderOrcamentos(b.dataset.filter)});
$('#filtroBtn').onclick=()=>$('#filtros').classList.toggle('hidden');
['buscarClientes','buscarOrcamentos','buscarFinanceiro'].forEach(id=>{const el=document.getElementById(id);if(el)el.oninput=()=>{if(id==='buscarClientes')searchClientes=el.value;else if(id==='buscarOrcamentos')searchOrcamentos=el.value;else searchFinanceiro=el.value;render()}});
function fixBotoesNovo(){
  document.querySelectorAll('#novoOrcamento').forEach(btn=>{ btn.onclick = () => novoOrc(); });
}
function render(){renderClientes();renderOrcamentos();renderFinanceiro(); fixBotoesNovo();}
loadPreferences();
if(isLogged())showApp();else showLogin();
