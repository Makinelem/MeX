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
   if(window.crypto?.getRandomValues){
     const a=new Uint32Array(1);
     crypto.getRandomValues(a);
     n=a[0]%1000000;
   } else n=Math.floor(Math.random()*1000000);
 } while(set.has('M'+String(n).padStart(6,'0')));
 return 'M'+String(n).padStart(6,'0');
}
function normalizeQuoteNumbers(){
 const used=[];
 (db.orcamentos||[]).forEach(q=>{
   // Números antigos sequenciais também passam para o novo padrão aleatório.
   q.numero=randomQuoteNumber(used);
   used.push(q.numero);
 });
 db.seq=1;
 save();
}
normalizeQuoteNumbers();
const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
const $=s=>document.querySelector(s);
let currentScreen='home';
let activeFinanceTab='abertos';

function auth(){return JSON.parse(localStorage.getItem(AUTH_KEY)||'null')||{user:'admin',pass:'1234'}}
function isLogged(){return localStorage.getItem(SESSION_KEY)==='1'}
function login(){
 const u=$('#loginUser')?.value.trim(),p=$('#loginPass')?.value;
 if(u===auth().user&&p===auth().pass){localStorage.setItem(SESSION_KEY,'1');localStorage.removeItem('mex_hidden_at');showApp();}
 else $('#loginError').textContent='Usuário ou senha inválidos.';
}
function logout(){localStorage.removeItem(SESSION_KEY);localStorage.removeItem('mex_hidden_at');showLogin()}
function showLogin(){document.body.classList.add('logged-out');$('#loginScreen').classList.remove('hidden');$('#appShell').classList.add('hidden')}
function showApp(){document.body.classList.remove('logged-out');$('#loginScreen').classList.add('hidden');$('#appShell').classList.remove('hidden');go(currentScreen||'home',false)}
function checkInactivity(){
 if(!isLogged())return;
 const hiddenAt=Number(localStorage.getItem('mex_hidden_at')||0);
 if(hiddenAt && Date.now()-hiddenAt>=INACTIVITY){logout()}
}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){if(isLogged())localStorage.setItem('mex_hidden_at',String(Date.now()))}
 else {checkInactivity();if(isLogged())localStorage.removeItem('mex_hidden_at')}
});
setInterval(checkInactivity,30000);

function go(id,doRender=true){currentScreen=id;document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));$('#'+id).classList.add('active');if(doRender)render();window.scrollTo({top:0,behavior:'smooth'});closeMenu()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b){e.preventDefault();go(b.dataset.go)}});

function openModal(title,html){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modal').classList.remove('hidden')}
$('#fecharModal').onclick=()=>$('#modal').classList.add('hidden');
$('#novoCliente').onclick=()=>openCliente();

function onlyDigits(v){return String(v||'').replace(/\D/g,'')}
function maskCpfCnpj(v){
 const d=onlyDigits(v).slice(0,14);
 if(d.length<=11) return d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
 return d.replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2');
}
function maskPhone(v){
 const d=onlyDigits(v).slice(0,11);
 if(d.length<=10) return d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d{1,4})$/,'$1-$2');
 return d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d{1,4})$/,'$1-$2');
}
function maskCep(v){const d=onlyDigits(v).slice(0,8);return d.replace(/(\d{5})(\d{1,3})$/,'$1-$2')}

function openCliente(id=null){
 const c=db.clientes.find(x=>x.id===id)||{};
 openModal(id?'Editar cliente':'Novo cliente',`<form id="clienteForm">
 <label>Nome*</label><input id="cNome" required value="${escapeAttr(c.nome||'')}">
 <label>Contato*</label><input id="cContato" required value="${escapeAttr(maskPhone(c.contato||''))}">
 <label>Endereço</label><input id="cEndereco" value="${escapeAttr(c.endereco||'')}">
 <label>CEP</label><input id="cCep" inputmode="numeric" value="${escapeAttr(maskCep(c.cep||''))}">
 <label>CPF/CNPJ</label><input id="cDoc" inputmode="numeric" value="${escapeAttr(maskCpfCnpj(c.doc||''))}">
 <div class="form-actions"><button type="submit" style="background:#17324d;color:white">Salvar</button></div></form>`);
 $('#cContato').oninput=e=>e.target.value=maskPhone(e.target.value);
 $('#cCep').oninput=e=>e.target.value=maskCep(e.target.value);
 $('#cDoc').oninput=e=>e.target.value=maskCpfCnpj(e.target.value);
 $('#clienteForm').onsubmit=e=>{e.preventDefault();const x={id:c.id||crypto.randomUUID(),nome:$('#cNome').value.trim(),contato:maskPhone($('#cContato').value),endereco:$('#cEndereco').value.trim(),cep:maskCep($('#cCep').value),doc:maskCpfCnpj($('#cDoc').value)};if(c.id)db.clientes=db.clientes.map(v=>v.id===c.id?x:v);else db.clientes.push(x);save();$('#modal').classList.add('hidden');render()};
}
function clienteDetalhes(id){
 const c=db.clientes.find(x=>x.id===id);if(!c)return;
 const wa=whatsappUrl(c.contato),tel=telUrl(c.contato);
 openModal('Dados do cliente',`<div class="client-detail"><h3>${escapeHtml(c.nome)}</h3>
 <div><b>Contato:</b> ${escapeHtml(c.contato||'-')}</div><div><b>Endereço:</b> ${escapeHtml(c.endereco||'-')}</div><div><b>CEP:</b> ${escapeHtml(c.cep||'-')}</div><div><b>CPF/CNPJ:</b> ${escapeHtml(c.doc||'-')}</div>
 <div class="contact-actions">${c.contato?`<a class="contact-btn whatsapp" href="${wa}" target="_blank" rel="noopener">💬 WhatsApp</a><a class="contact-btn call" href="${tel}">☎ Chamada</a>`:''}</div>
 <div class="form-actions"><button onclick="openCliente('${id}')">✎ Editar</button><button class="danger" onclick="delCliente('${id}')">🗑 Excluir</button></div></div>`);
}
function delCliente(id){
 const c=db.clientes.find(x=>x.id===id);if(!c)return;
 if(confirm(`Excluir o cliente ${c.nome}?`)){db.clientes=db.clientes.filter(x=>x.id!==id);save();$('#modal').classList.add('hidden');render()}
}
function renderClientes(){
 $('#clientesLista').innerHTML=db.clientes.map(c=>`<div class="list-card client-card" onclick="clienteDetalhes('${c.id}')">
   <b>${escapeHtml(c.nome)}</b><a class="meta contact-link" href="${telUrl(c.contato)}" onclick="event.stopPropagation()">${escapeHtml(c.contato)}</a>
   <div class="actions" onclick="event.stopPropagation()">
     <button class="quote-icon" title="Editar" aria-label="Editar" onclick="openCliente('${c.id}')">✎</button>
     <button class="quote-icon danger-icon" title="Excluir" aria-label="Excluir" onclick="delCliente('${c.id}')">🗑</button>
     <span class="spacer"></span><button onclick="novoOrc('${c.id}')">+ Novo orçamento</button>
   </div></div>`).join('')||'<div class="list-card">Nenhum cliente cadastrado.</div>'
}

$('#novoOrcamento').onclick=()=>novoOrc();
function novoOrc(clienteId=null,id=null){
 const q=db.orcamentos.find(x=>x.id===id)||{clienteId:clienteId||'',items:[],validade:15,status:'pendente'};
 if(q.status!=='pendente'&&id){openModal('Aviso','<p>Somente orçamentos pendentes podem ser editados.</p>');return}
 openModal(id?'Editar orçamento':'Novo orçamento',`<form id="orcForm">
 <label>Cliente*</label><select id="qCliente" required><option value="">Selecione</option>${db.clientes.map(c=>`<option value="${c.id}" ${c.id===q.clienteId?'selected':''}>${escapeHtml(c.nome)}</option>`).join('')}</select>
 <label>Validade (dias)</label><input id="qValidade" type="number" min="1" value="${q.validade||15}">
 <div id="itens"></div><button type="button" class="secondary" id="addItem">+ Adicionar item</button>
 <div class="form-actions quote-save-actions"><button type="submit" style="background:#17324d;color:white">Salvar orçamento</button>${q.status==='pendente'?'<button type="button" id="saveShare" class="share-save">↗ Salvar e compartilhar</button>':''}</div></form>`);
 let items=[...(q.items||[])];
 const paint=()=>{$('#itens').innerHTML=items.map((it,i)=>`<div class="list-card" style="margin:10px 0"><b>Item ${i+1}</b>
 <label>Nome*</label><input class="in" data-k="nome" data-i="${i}" value="${escapeAttr(it.nome||'')}">
 <label>Descrição*</label><textarea class="in" data-k="desc" data-i="${i}">${escapeHtml(it.desc||'')}</textarea>
 <label>QTD*</label><input class="in" data-k="qtd" data-i="${i}" type="number" min="0" step="0.01" value="${it.qtd??1}">
 <label>Valor unitário*</label><input class="in" data-k="uni" data-i="${i}" type="number" min="0" step="0.01" value="${it.uni??0}">
 <div class="meta">Total: <b class="item-total">${money((it.qtd||0)*(it.uni||0))}</b></div></div>`).join('')};
 paint();$('#addItem').onclick=()=>{items.push({qtd:1,uni:0});paint()};
 $('#orcForm').oninput=e=>{if(e.target.classList.contains('in')){const i=Number(e.target.dataset.i),k=e.target.dataset.k;if(items[i])items[i][k]=e.target.value;const t=e.target.closest('.list-card')?.querySelector('.item-total');if(t)t.textContent=money((Number(items[i].qtd)||0)*(Number(items[i].uni)||0))}};
 const saveQuote=(shareAfter=false)=>{
   if(!items.length||items.some(x=>!String(x.nome||'').trim()||!String(x.desc||'').trim()||!x.qtd||x.uni==='')){alert('Preencha todos os campos obrigatórios dos itens.');return}
   if(!$('#qCliente').value){alert('Selecione o cliente.');return}
   const now=new Date();const x={...q,id:q.id||crypto.randomUUID(),numero:q.numero||randomQuoteNumber(db.orcamentos.map(v=>v.numero)),clienteId:$('#qCliente').value,validade:Number($('#qValidade').value)||15,data:q.data||now.toISOString(),status:q.status||'pendente',items:items.map((it,i)=>({...it,nome:String(it.nome).trim(),desc:String(it.desc).trim(),qtd:Number(it.qtd),uni:Number(it.uni),item:i+1}))};
   if(q.id)db.orcamentos=db.orcamentos.map(v=>v.id===q.id?x:v);else db.orcamentos.push(x);save();$('#modal').classList.add('hidden');render();if(shareAfter)compartilharOrcamento(x.id)
 };
 $('#orcForm').onsubmit=e=>{e.preventDefault();saveQuote(false)};
 if($('#saveShare'))$('#saveShare').onclick=()=>saveQuote(true);
}
function isPaid(q){return paymentPercent(q)>=100;}
function paidWatermark(q){return isPaid(q)?'<div class="paid-watermark" aria-label="PAGO">PAGO</div>':''}

function renderOrcamentos(filter='todos'){
 const list=db.orcamentos.filter(q=>filter==='todos'||q.status===filter).sort((a,b)=>b.data.localeCompare(a.data));
 $('#orcamentosLista').innerHTML=list.map(q=>{
   const c=db.clientes.find(x=>x.id===q.clienteId),total=quoteTotal(q),contato=String(c?.contato||'');
   const itens=(q.items||[]).map((it,i)=>`<div class="quote-item"><b>${escapeHtml(i+1+'. '+it.nome)}</b><div>${escapeHtml(it.desc)}</div><small>Qtd: ${it.qtd} • Unit.: ${money(it.uni)} • Total: ${money((it.qtd||0)*(it.uni||0))}</small></div>`).join('');
   const paidDeleteAction=isPaid(q)&&q.pagoExclusaoLiberada?`<button class="quote-icon danger-icon" title="Excluir orçamento pago" aria-label="Excluir orçamento pago" onclick="delQ('${q.id}')">🗑</button>`:'';
   const actions=q.status==='pendente'?`<button class="quote-icon" title="Editar" aria-label="Editar" onclick="novoOrc(null,'${q.id}')">✎</button><button class="quote-icon" title="Aprovar" aria-label="Aprovar" onclick="statusQ('${q.id}','aprovado')">✓</button><button class="quote-icon" title="Cancelar" aria-label="Cancelar" onclick="statusQ('${q.id}','cancelado')">🔒</button>`:q.status==='cancelado'?`<button class="quote-icon" title="Voltar para pendente" aria-label="Voltar para pendente" onclick="statusQ('${q.id}','pendente')">✎</button><button class="quote-icon" title="Excluir" aria-label="Excluir" onclick="delQ('${q.id}')">🗑</button>`:q.status==='aprovado'?`<button class="quote-icon" title="Editar" aria-label="Editar" onclick="novoOrc(null,'${q.id}')">✎</button><button class="quote-icon" title="Cancelar" aria-label="Cancelar" onclick="statusQ('${q.id}','cancelado')">🔒</button><button class="quote-icon" title="Concluir" aria-label="Concluir" onclick="statusQ('${q.id}','concluido')">✓</button>`:q.status==='vencido'?`<button class="quote-icon" title="Voltar para pendente" aria-label="Voltar para pendente" onclick="statusQ('${q.id}','pendente')">✎</button><button class="quote-icon" title="Excluir" aria-label="Excluir" onclick="delQ('${q.id}')">🗑</button>`:paidDeleteAction;
   const detailShare=q.status==='pendente'?`<button class="share-detail" onclick="compartilharOrcamento('${q.id}')">↗ Compartilhar PDF</button>`:'';
   return `<div class="list-card ${q.status} quote-card ${isPaid(q)?'is-paid':''}" onclick="toggleQuoteDetail('${q.id}')">${paidWatermark(q)}<b>Orçamento Nº ${q.numero}</b><div class="meta">${escapeHtml(c?.nome||'Cliente não informado')} • ${new Date(q.data).toLocaleDateString('pt-BR')}</div>
   <div class="quote-actions" onclick="event.stopPropagation()">${contato?`<a class="quote-contact" href="${whatsappUrl(contato)}" target="_blank" rel="noopener" title="Abrir WhatsApp">☎ <span>${escapeHtml(contato)}</span></a>`:''}<span class="spacer"></span>${actions}</div>
   <div class="quote-detail hidden" id="detail-${q.id}"><div class="meta"><b>Cliente:</b> ${escapeHtml(c?.nome||'')}<br><b>Contato:</b> ${escapeHtml(c?.contato||'')}<br><b>Validade:</b> ${q.validade||15} dias</div><div class="quote-items">${itens||'<div class="meta">Nenhum item.</div>'}</div><div class="quote-total"><b>Total do orçamento: ${money(total)}</b></div>${detailShare}</div></div>`
 }).join('')||'<div class="list-card">Nenhum orçamento encontrado.</div>';
 schedulePaidDeletionPrompt();
}
function paidAgeDays(q){
 const t=new Date(q.data).getTime();
 return Number.isFinite(t)?Math.floor((Date.now()-t)/86400000):0;
}
function schedulePaidDeletionPrompt(){
 if(paidDeletePromptOpen)return;
 const q=db.orcamentos.find(x=>isPaid(x)&&paidAgeDays(x)>=PAID_DELETE_DAYS&&!x.pagoExclusaoRespondida);
 if(!q)return;
 setTimeout(()=>promptPaidDeletion(q.id),120);
}
function promptPaidDeletion(id){
 if(paidDeletePromptOpen)return;
 const q=db.orcamentos.find(x=>x.id===id);
 if(!q||!isPaid(q)||paidAgeDays(q)<PAID_DELETE_DAYS||q.pagoExclusaoRespondida)return;
 paidDeletePromptOpen=true;
 const c=db.clientes.find(x=>x.id===q.clienteId);
 openModal('Orçamento pago há mais de 60 dias',`<div class="paid-delete-prompt"><p>O orçamento <b>${escapeHtml(q.numero)}</b>${c?.nome?` do cliente <b>${escapeHtml(c.nome)}</b>`:''} está totalmente quitado e possui a marca d'água <b>PAGO</b> há mais de 60 dias.</p><p>Deseja excluir este orçamento?</p><div class="form-actions"><button type="button" id="paidDeleteNo">Não</button><button type="button" id="paidDeleteYes" class="danger">Sim, excluir</button></div></div>`);
 $('#paidDeleteNo').onclick=()=>{q.pagoExclusaoRespondida=true;q.pagoExclusaoLiberada=true;save();paidDeletePromptOpen=false;$('#modal').classList.add('hidden');renderOrcamentos()};
 $('#paidDeleteYes').onclick=()=>{paidDeletePromptOpen=false;$('#modal').classList.add('hidden');db.orcamentos=db.orcamentos.filter(x=>x.id!==id);save();render()};
}

function statusQ(id,s){const q=db.orcamentos.find(x=>x.id===id);if(q){q.status=s;save();render()}}
function delQ(id){if(confirm('Excluir este orçamento?')){db.orcamentos=db.orcamentos.filter(x=>x.id!==id);save();render()}}
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
function financeClass(p){return p>=100?'pay100':p>=67?'pay67':p>33?'pay34':'pay33'}
function renderFinanceiro(){
 const all=db.orcamentos.filter(q=>q.status==='aprovado'||q.status==='concluido');
 const qs=activeFinanceTab==='finalizados'?all.filter(q=>paymentPercent(q)>=100):activeFinanceTab==='relatorio'?all:all.filter(q=>paymentPercent(q)<100);
 $('#financeiroLista').innerHTML=qs.map(q=>{const c=db.clientes.find(x=>x.id===q.clienteId),p=paymentPercent(q);return `<div class="list-card finance-card ${financeClass(p)}" onclick="financeiro('${q.id}')"><b>Orçamento Nº ${q.numero}</b><div class="meta">${escapeHtml(c?.nome||'')}</div><a class="whatsapp" href="${whatsappUrl(c?.contato||'')}" onclick="event.stopPropagation()">☎ ${escapeHtml(c?.contato||'')}</a></div>`}).join('')||'<div class="list-card">Nenhum orçamento nesta categoria.</div>'
}

document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{activeFinanceTab=b.dataset.tab;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));renderFinanceiro()});
function financeiro(id){
 const q=db.orcamentos.find(x=>x.id===id);if(!q)return;const c=db.clientes.find(x=>x.id===q.clienteId),total=quoteTotal(q),mov=normalizeFinance(q),rec=received(q),rest=Math.max(0,total-rec);
 const history=mov.slice().sort((a,b)=>new Date(b.data)-new Date(a.data)).map(m=>`<div class="movement"><div><b>${escapeHtml(m.metodo)}</b><small>${new Date(m.data).toLocaleDateString('pt-BR')}${m.parcelas>1?' • '+m.parcelas+' parcelas':''}</small></div><strong>${money(m.valor)}</strong></div>`).join('')||'<div class="meta">Nenhuma movimentação registrada.</div>';
 openModal(`Financeiro • Nº ${q.numero}`,`<p><b>${escapeHtml(c?.nome||'')}</b><br><a class="whatsapp" href="${whatsappUrl(c?.contato||'')}" target="_blank" rel="noopener">☎ ${escapeHtml(c?.contato||'')}</a></p><p>Total do orçamento: <b>${money(total)}</b><br>Total recebido: <b>${money(rec)}</b><br><span class="balance">Falta receber: <b>${money(rest)}</b></span></p><h3>Histórico de movimentação</h3><div class="movement-list">${history}</div>${rest>0?`<button class="primary add-movement" id="addMovement">+ Adicionar movimentação</button>`:'<div class="paid-badge">Pagamento quitado</div>'}`);
 if($('#addMovement'))$('#addMovement').onclick=()=>addMovimento(q.id);
}
function addMovimento(id){
 const q=db.orcamentos.find(x=>x.id===id);if(!q)return;const total=quoteTotal(q),rest=Math.max(0,total-received(q));
 openModal('Adicionar movimentação',`<form id="movForm"><p>Falta receber: <b>${money(rest)}</b></p><label>Data</label><input id="movData" type="date" value="${new Date().toISOString().slice(0,10)}"><label>Forma de pagamento</label><select id="movPay"><option value="">Selecione</option><option>PIX</option><option>Espécie</option><option>Débito</option><option>Crédito à vista</option><option>Crédito parcelado</option></select><label>Parcelas (se aplicável)</label><input id="movParc" type="number" min="1" value="1"><label>Valor recebido</label><input id="movValor" type="number" min="0.01" max="${rest}" step="0.01" required><div class="form-actions"><button type="submit" style="background:#17324d;color:white">Adicionar</button></div></form>`);
 $('#movForm').onsubmit=e=>{e.preventDefault();const valor=Number($('#movValor').value)||0;if(!$('#movPay').value||valor<=0||valor>rest){alert('Informe uma forma de pagamento e um valor válido.');return}normalizeFinance(q).push({id:crypto.randomUUID(),data:new Date($('#movData').value+'T12:00:00').toISOString(),metodo:$('#movPay').value,parcelas:Number($('#movParc').value)||1,valor});if(received(q)>=total)q.status='concluido';save();$('#modal').classList.add('hidden');render()}
}

function toggleQuoteDetail(id){const el=document.getElementById('detail-'+id);if(el)el.classList.toggle('hidden')}
function whatsappUrl(v){const digits=String(v||'').replace(/\D/g,'');return digits?`https://wa.me/${digits}`:'#'}
function telUrl(v){const digits=String(v||'').replace(/\D/g,'');return digits?`tel:${digits}`:'#'}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function escapeAttr(v){return escapeHtml(v)}

function firstName(name){return String(name||'Cliente').trim().split(/\s+/)[0]||'Cliente'}
function pdfEscape(v){return String(v??'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function pdfTextSafe(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function wrapPdfText(text,max){const words=pdfTextSafe(text).split(/\s+/);const lines=[];let line='';words.forEach(w=>{if((line+' '+w).trim().length>max){if(line)lines.push(line);line=w}else line=(line+' '+w).trim()});if(line)lines.push(line);return lines}
function pdfBytes(s){const out=new Uint8Array(s.length);for(let i=0;i<s.length;i++)out[i]=s.charCodeAt(i)&255;return out}
function pdfConcat(parts){let n=0;parts.forEach(p=>n+=p.length);const out=new Uint8Array(n);let o=0;parts.forEach(p=>{out.set(p,o);o+=p.length});return out}
const HELV_WIDTHS={A:.667,B:.667,C:.722,D:.722,E:.667,F:.611,G:.778,H:.722,I:.278,J:.5,K:.667,L:.556,M:.833,N:.722,O:.778,P:.667,Q:.778,R:.722,S:.667,T:.611,U:.722,V:.667,W:.944,X:.667,Y:.667,Z:.611,a:.556,b:.556,c:.5,d:.556,e:.556,f:.278,g:.556,h:.556,i:.222,j:.222,k:.5,l:.222,m:.833,n:.556,o:.556,p:.556,q:.556,r:.333,s:.5,t:.278,u:.556,v:.5,w:.722,x:.5,y:.5,z:.5,'0':.556,'1':.556,'2':.556,'3':.556,'4':.556,'5':.556,'6':.556,'7':.556,'8':.556,'9':.556,' ':.278,':':.278,'/':.278,'-':.333,'.':.278,'°':.4,'º':.365};
const HELV_BOLD_WIDTHS={A:.722,B:.722,C:.722,D:.722,E:.667,F:.611,G:.778,H:.722,I:.278,J:.556,K:.722,L:.611,M:.833,N:.722,O:.778,P:.667,Q:.778,R:.722,S:.667,T:.611,U:.722,V:.667,W:.944,X:.667,Y:.667,Z:.611,a:.556,b:.611,c:.556,d:.611,e:.556,f:.333,g:.611,h:.611,i:.278,j:.278,k:.556,l:.278,m:.889,n:.611,o:.611,p:.611,q:.611,r:.389,s:.556,t:.333,u:.611,v:.556,w:.778,x:.556,y:.556,z:.5,'0':.556,'1':.556,'2':.556,'3':.556,'4':.556,'5':.556,'6':.556,'7':.556,'8':.556,'9':.556,' ':.278,':':.333,'/':.278,'-':.333,'.':.278,'°':.4,'º':.365};
function pdfTextWidthApprox(v,size=9,bold=false){const map=bold?HELV_BOLD_WIDTHS:HELV_WIDTHS;return [...pdfTextSafe(v)].reduce((n,ch)=>n+(map[ch]??.5),0)*size}
function pdfRightX(v,right,size=9,bold=false){return Math.max(0,right-pdfTextWidthApprox(v,size,bold))}
function pdfCenterX(v,center,size=9,bold=false){return Math.max(0,center-pdfTextWidthApprox(v,size,bold)/2)}
function pdfEscape(v){return String(v??'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function pdfTextSafe(v){const s=String(v??'');return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\u0000-\u001F]/g,' ')}
function wrapPdfText(text,max){const words=pdfTextSafe(text).trim().split(/\s+/).filter(Boolean),lines=[];let line='';words.forEach(w=>{const test=(line+' '+w).trim();if(test.length>max){if(line)lines.push(line);line=w}else line=test});if(line)lines.push(line);return lines}
function pdfBytes(s){const out=new Uint8Array(s.length);for(let i=0;i<s.length;i++)out[i]=s.charCodeAt(i)&255;return out}

async function compressPdfBytes(bytes){
  if(typeof CompressionStream==='function'){
    const cs=new CompressionStream('deflate');
    const stream=new Blob([bytes]).stream().pipeThrough(cs);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return bytes;
}

function b64ToUint8(b64){
 const bin=atob(b64); const out=new Uint8Array(bin.length);
 for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
 return out;
}

// As imagens do PDF são carregadas DIRETAMENTE do diretório do projeto.
// Não há cópias embutidas, fallback ou redimensionamento da fonte.
// O tamanho de exibição no PDF é definido pelo layout; a resolução original do PNG é preservada.
async function loadPdfImage(path){
  // O PDF lê o PNG como bytes diretamente do servidor local. Não usa Image, Canvas
  // nem getImageData. Isso preserva a resolução e a transparência do arquivo original.
  if(location.protocol === 'file:'){
    throw new Error(`O MeX foi aberto diretamente como arquivo (file://). Para o PDF acessar ${path} com a resolução original, feche esta janela e execute iniciar_meX.bat. O navegador bloqueia a leitura de arquivos locais pelo JavaScript.`);
  }
  const src = new URL(path, document.baseURI).href;
  let response;
  try{
    response = await fetch(src, {cache:'no-store'});
  }catch(e){
    throw new Error(`Não foi possível acessar ${path}. Execute iniciar_meX.bat e abra o endereço http://127.0.0.1:8765/.`);
  }
  if(!response.ok) throw new Error(`Não foi possível carregar ${path} (${response.status}). Verifique se ${path} está na mesma pasta do index.html.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const sig = [137,80,78,71,13,10,26,10];
  for(let i=0;i<8;i++) if(bytes[i]!==sig[i]) throw new Error(`${path} não é um PNG válido.`);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos=8, width=0, height=0, bitDepth=0, colorType=0, interlace=0;
  let idat=[];
  while(pos+8<=bytes.length){
    const len=dv.getUint32(pos); pos+=4;
    const type=String.fromCharCode(bytes[pos],bytes[pos+1],bytes[pos+2],bytes[pos+3]); pos+=4;
    if(pos+len+4>bytes.length) throw new Error(`PNG ${path} está incompleto.`);
    const data=bytes.subarray(pos,pos+len); pos+=len; pos+=4; // CRC
    if(type==='IHDR'){
      width=dv.getUint32(data.byteOffset);
      height=dv.getUint32(data.byteOffset+4);
      bitDepth=data[8]; colorType=data[9]; interlace=data[12];
    }else if(type==='IDAT') idat.push(data);
    else if(type==='IEND') break;
  }
  if(!width || !height) throw new Error(`PNG ${path} sem dimensões válidas.`);
  if(bitDepth!==8 || colorType!==6 || interlace!==0){
    throw new Error(`${path} precisa ser PNG RGBA 8-bit sem entrelaçamento. O arquivo enviado pelo projeto deve permanecer em PNG transparente.`);
  }
  const compressed=new Uint8Array(idat.reduce((n,a)=>n+a.length,0));
  let at=0; for(const a of idat){compressed.set(a,at);at+=a.length;}
  if(typeof DecompressionStream!=='function') throw new Error('Este navegador não suporta a leitura direta do PNG. Use uma versão atual do Chrome/Edge.');
  const ds=new DecompressionStream('deflate');
  const raw=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(ds)).arrayBuffer());
  const stride=width*4, expected=(stride+1)*height;
  if(raw.length<expected) throw new Error(`Dados internos de ${path} estão incompletos.`);
  const rgba=new Uint8Array(width*height*4);
  const pa=(x)=>x<0?0:x;
  for(let y=0;y<height;y++){
    const srcRow=y*(stride+1), filter=raw[srcRow];
    const row=srcRow+1, out=y*stride, prev=(y-1)*stride;
    for(let x=0;x<stride;x++){
      const a=x>=4?rgba[out+x-4]:0;
      const b=y>0?rgba[prev+x]:0;
      const c=(y>0&&x>=4)?rgba[prev+x-4]:0;
      const v=raw[row+x];
      let z;
      if(filter===0) z=v;
      else if(filter===1) z=(v+a)&255;
      else if(filter===2) z=(v+b)&255;
      else if(filter===3) z=(v+Math.floor((a+b)/2))&255;
      else if(filter===4){
        const p=a+b-c, pa_=Math.abs(p-a), pb_=Math.abs(p-b), pc_=Math.abs(p-c);
        const pr=pa_<=pb_&&pa_<=pc_?a:(pb_<=pc_?b:c); z=(v+pr)&255;
      }else throw new Error(`Filtro PNG ${filter} não suportado em ${path}.`);
      rgba[out+x]=z;
    }
  }
  const rgb=new Uint8Array(width*height*3), alpha=new Uint8Array(width*height);
  let ri=0,ai=0;
  for(let i=0;i<rgba.length;i+=4){rgb[ri++]=rgba[i];rgb[ri++]=rgba[i+1];rgb[ri++]=rgba[i+2];alpha[ai++]=rgba[i+3];}
  const deflate=async b=>{
    const cs=new CompressionStream('deflate');
    return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(cs)).arrayBuffer());
  };
  return {w:width,h:height,rgb:await deflate(rgb),alpha:await deflate(alpha),filter:'/FlateDecode'};
}

async function gerarPdfOrcamento(q){
 const c=db.clientes.find(x=>x.id===q.clienteId)||{};
 const total=quoteTotal(q), data=new Date(q.data||Date.now()).toLocaleDateString('pt-BR'), validade=Number(q.validade)||15;
 const logo=await loadPdfImage('logo.png');
 const zap=await loadPdfImage('zap.png');
 const content=[]; const pageW=595,pageH=842;
 const text=(s,x,y,size=9,bold=false)=>content.push(`BT /${bold?'F2':'F1'} ${size} Tf 0 g ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(pdfTextSafe(s))}) Tj ET`);
 const line=(x1,y1,x2,y2,gray='0.82')=>content.push(`${gray} G 0.65 w ${x1} ${y1} m ${x2} ${y2} l S`);
 const rect=(x,y,w,h,fill='0.92',stroke=true)=>{content.push(`${fill} g ${x} ${y} ${w} ${h} re f`);if(stroke)content.push(`0.82 G 0.65 w ${x} ${y} ${w} ${h} re S`)};
 const img=(name,w,h,x,y)=>content.push(`q ${w} 0 0 ${h} ${x} ${y} cm /${name} Do Q`);
 // CABEÇALHO: logo | empresa | orçamento. A primeira barra fica próxima ao bloco da empresa.
 if(logo) img('Logo',110,45,30,775);
 line(175,775,175,820); line(430,775,430,820);
 const companyX=190;
 text('Rua Nova, 6760 Pedra Mole',companyX,807,8.5);
 text('CEP: 64065-000',companyX,794,8.5);
 text('CNPJ: 59.687.966/0001-91',companyX,781,8.5);
 const companyContact='(86) 98813-6559';
 text(companyContact,companyX,768,8.5);
 if(zap) img('Zap',11,11,companyX+pdfTextWidthApprox(companyContact,8.5,false)+4,766);
 const budgetTitle='ORÇAMENTO/PEDIDO',budgetNo='N°: '+q.numero,budgetDate='Emissão: '+data,budgetValidity='Validade: '+validade+' dias';
 const budgetRight=555;
 text(budgetTitle,pdfRightX(budgetTitle,budgetRight,9.5,true),807,9.5,true);
 text(budgetNo,pdfRightX(budgetNo,budgetRight,8.5,true),793,8.5,true);
 text(budgetDate,pdfRightX(budgetDate,budgetRight,8.5),779,8.5);
 text(budgetValidity,pdfRightX(budgetValidity,budgetRight,8.5),765,8.5);
 // Espaço proposital entre o cabeçalho e a primeira barra horizontal.
 line(30,748,565,748);
 // CLIENTE
 text('Destinatário/ Cliente:',30,731,9.5,true);
 const clientLine=(label,value,y)=>{const safe=String(value||'-');text(label,30,y,8.5,false);text(safe,30+pdfTextWidthApprox(label,8.5,false)+3,y,8.5,true)};
 clientLine('Nome/ Razão Social: ',c.nome,714);
 clientLine('CPF/ CNPJ: ',maskCpfCnpj(c.doc),703);
 clientLine('Endereço (Opcional): ',c.endereco,692);
 clientLine('Telefone/ Contato: ',maskPhone(c.contato),681);
 line(30,653,565,653);
 // TABELA
 const tableX=30,tableW=535,headerY=623,headerH=17; rect(tableX,headerY,tableW,headerH,'0.92',false);
 text('ITEM',36,628,8.2,true); text('DESCRIÇÃO DO PRODUTO',75,628,8.2,true); text('QTD',370,628,8.2,true); text('VALOR UNI',425,628,8.2,true); text('VALOR TOTAL',495,628,8.2,true);
 let rowTop=headerY; const items=q.items||[];
 items.forEach((it,i)=>{const descLines=wrapPdfText(it.desc||'',62),rowH=Math.max(31,descLines.length*7+20),bottom=rowTop-rowH; line(tableX,bottom,tableX+tableW,bottom,'0.88'); text(String(i+1),35,rowTop-14,8.8,true); text(it.nome||'',75,rowTop-14,8.8,true); descLines.slice(0,6).forEach((d,k)=>text(d,75,rowTop-24-k*7,8.1,false)); text(String(it.qtd??0),370,rowTop-14,8.8); text(money(it.uni),425,rowTop-14,8.8); text(money((Number(it.qtd)||0)*(Number(it.uni)||0)),495,rowTop-14,8.8); rowTop=bottom});
 if(!items.length){line(tableX,rowTop-35,tableX+tableW,rowTop-35,'0.88');text('-',75,rowTop-14,8.8)}
 // RODAPÉ
 const footerY=47,footerH=33; rect(30,footerY,330,footerH,'0.92',true); rect(370,footerY,195,footerH,'0.92',true);
 text('Este documento é uma proposta comercial sujeita a aprovação.',40,69,7.5); text('Garantia de fábrica de acordo com o especificado no contrato de execução.',40,56,7.5);
 const totalLabel='VALOR TOTAL DO ORÇAMENTO', totalValue=money(total); const totalRight=555;
 text(totalLabel,pdfRightX(totalLabel,totalRight,8,true),69,8,true); text(totalValue,pdfRightX(totalValue,totalRight,13.5,true),52,13.5,true);
 if(String(q.status||'').toLowerCase()==='concluido' && isPaid(q)){const wm='PAGO',wmSize=86,wmX=pdfCenterX(wm,298,wmSize);content.push('q');content.push('1 0 0 rg');content.push(`BT /F2 ${wmSize} Tf 0.7071 0.7071 -0.7071 0.7071 ${wmX} 355 Tm (${pdfEscape(wm)}) Tj ET`);content.push('Q')}
 const stream=content.join('\n');
 const objs=[]; objs[1]='<< /Type /Catalog /Pages 2 0 R >>'; objs[2]='<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
 const xobjParts=`/Logo 7 0 R /Zap 9 0 R`;
 objs[3]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /ProcSet [/PDF /Text /ImageC] /Font << /F1 5 0 R /F2 6 0 R >> /XObject << ${xobjParts} >> >> /Contents 4 0 R >>`;
 const contentBytes=pdfBytes(stream);
 objs[4]=`<< /Length ${contentBytes.length} >>\nstream\n`;
 objs[5]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
 objs[6]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
 // 7/8: RGB das imagens; 9/10: máscaras de transparência (alpha).
 objs[7]=`<< /Type /XObject /Subtype /Image /Width ${logo.w} /Height ${logo.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter ${logo.filter} /SMask 8 0 R /Length ${logo.rgb.length} >>\nstream\n`;
 objs[8]=`<< /Type /XObject /Subtype /Image /Width ${logo.w} /Height ${logo.h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter ${logo.filter} /Length ${logo.alpha.length} >>\nstream\n`;
 objs[9]=`<< /Type /XObject /Subtype /Image /Width ${zap.w} /Height ${zap.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter ${zap.filter} /SMask 10 0 R /Length ${zap.rgb.length} >>\nstream\n`;
 objs[10]=`<< /Type /XObject /Subtype /Image /Width ${zap.w} /Height ${zap.h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter ${zap.filter} /Length ${zap.alpha.length} >>\nstream\n`;
 const objBytes={
   4:new Uint8Array([...pdfBytes(objs[4]),...contentBytes,...pdfBytes('endstream')]),
   7:new Uint8Array([...pdfBytes(objs[7]),...logo.rgb,...pdfBytes('endstream')]),
   8:new Uint8Array([...pdfBytes(objs[8]),...logo.alpha,...pdfBytes('endstream')]),
   9:new Uint8Array([...pdfBytes(objs[9]),...zap.rgb,...pdfBytes('endstream')]),
   10:new Uint8Array([...pdfBytes(objs[10]),...zap.alpha,...pdfBytes('endstream')])
 };
 let parts=[pdfBytes('%PDF-1.4\n')],offsets=[0],offset=parts[0].length;
 for(let i=1;i<=10;i++){
   let b;
   if(i===4||i===7||i===8||i===9||i===10) b=new Uint8Array([...pdfBytes(i+' 0 obj\n'),...objBytes[i],...pdfBytes('\nendobj\n')]);
   else b=pdfBytes(i+' 0 obj\n'+objs[i]+'\nendobj\n');
   offsets[i]=offset;parts.push(b);offset+=b.length;
 }
 const xref=offset;parts.push(pdfBytes('xref\n0 11\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 11 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF'));
 const totalBytes=parts.reduce((n,p)=>n+p.length,0); const pdf=new Uint8Array(totalBytes); let at=0; for(const p of parts){pdf.set(p,at);at+=p.length;} return new Blob([pdf],{type:'application/pdf'});
}

async function compartilharOrcamento(id){
 try{
   const q=db.orcamentos.find(x=>x.id===id);
   if(!q) throw new Error('Orçamento não encontrado.');
   const c=db.clientes.find(x=>x.id===q.clienteId)||{};
   const blob=await gerarPdfOrcamento(q);
   if(!blob || blob.size<1000) throw new Error('O PDF não foi gerado corretamente.');
   const nome=`Orçamento ${q.numero}, ${firstName(c.nome)}.pdf`;
   const file=new File([blob],nome,{type:'application/pdf'});
   // Em celulares/navegadores compatíveis, abre o compartilhamento nativo com o PDF anexado.
   if(typeof navigator.share==='function'){
     let podeCompartilhar=true;
     if(typeof navigator.canShare==='function') podeCompartilhar=navigator.canShare({files:[file]});
     if(podeCompartilhar){
       try{await navigator.share({title:`Orçamento ${q.numero}`,text:`Orçamento Nº ${q.numero} - ${c.nome||''}`,files:[file]});return;}
       catch(e){if(e?.name==='AbortError')return;}
     }
   }
   // Fallback: sempre baixa um PDF real, inclusive em desktop ou quando o navegador
   // não oferece compartilhamento de arquivos.
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download=nome;document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),3000);
 }catch(e){
   console.error('Erro ao compartilhar PDF:',e);
   alert('Não foi possível gerar o PDF.\n\nDetalhe: '+(e?.message||e));
 }
}

function closeMenu(){$('#sideMenu')?.classList.add('hidden')}
$('#menuBtn').onclick=()=>$('#sideMenu').classList.toggle('hidden');
$('#menuClose').onclick=closeMenu;
$('#menuUser').onclick=()=>{closeMenu();openUserSettings()};
$('#menuLogout').onclick=logout;
$('#menuSettings').onclick=()=>{closeMenu();openSettings()};
function openUserSettings(){
 const a=auth();
 openModal('Usuário',`<form id="userForm">
   <label>Nome de usuário</label><input id="userName" autocomplete="username" value="${escapeAttr(a.user||'')}" required>
   <label>Senha atual</label><input id="currentPass" type="password" autocomplete="current-password" required>
   <label>Nova senha</label><input id="newPass" type="password" autocomplete="new-password" placeholder="Deixe em branco para manter a atual">
   <label>Confirmar nova senha</label><input id="newPass2" type="password" autocomplete="new-password" placeholder="Deixe em branco para manter a atual">
   <div class="form-actions"><button type="submit" style="background:#17324d;color:white">Salvar</button></div>
 </form>`);
 $('#userForm').onsubmit=e=>{
   e.preventDefault();
   const current=$('#currentPass').value;
   const name=$('#userName').value.trim();
   const np=$('#newPass').value;
   const np2=$('#newPass2').value;
   if(current!==a.pass){alert('Senha atual inválida.');return}
   if(!name){alert('Informe o nome de usuário.');return}
   if((np||np2)&&np!==np2){alert('A confirmação da nova senha não confere.');return}
   localStorage.setItem(AUTH_KEY,JSON.stringify({user:name,pass:np||a.pass}));
   $('#modal').classList.add('hidden');
   alert('Dados de usuário atualizados.');
 };
}

function openSettings(){
 openModal('Ajustes',`<label>Tema</label><div class="theme-options"><button data-theme="claro">Claro</button><button data-theme="medio">Médio</button><button data-theme="escuro">Escuro</button></div><label>Fonte: Ajustar tamanho da fonte</label><input id="fontRange" type="range" min="90" max="125" step="5" value="${Number(localStorage.getItem('mex_font')||100)}"><div class="font-preview" id="fontPreview">Tamanho atual da fonte</div>`);
 document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>setTheme(b.dataset.theme));$('#fontRange').oninput=e=>setFont(Number(e.target.value));
}
function setTheme(t){document.body.dataset.theme=t;localStorage.setItem('mex_theme',t)}
function setFont(v){document.documentElement.style.setProperty('--font-scale',(v/100).toFixed(2));localStorage.setItem('mex_font',v);if($('#fontPreview'))$('#fontPreview').textContent=`Tamanho atual: ${v}%`}
function loadPreferences(){setTheme(localStorage.getItem('mex_theme')||'claro');setFont(Number(localStorage.getItem('mex_font')||100))}

$('#loginForm').onsubmit=e=>{e.preventDefault();login()};
$('#loginPass').onkeydown=e=>{if(e.key==='Enter')login()};

document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{$('#filtros').classList.add('hidden');renderOrcamentos(b.dataset.filter)});
$('#filtroBtn').onclick=()=>$('#filtros').classList.toggle('hidden');

function render(){renderClientes();renderOrcamentos();renderFinanceiro()}
loadPreferences();
if(isLogged())showApp();else showLogin();
