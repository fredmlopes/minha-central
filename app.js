(function(){
'use strict';
var $=function(id){return document.getElementById(id);};
var zone='America/Sao_Paulo', busy=false, lastFetch=0;
var SVG='http://www.w3.org/2000/svg';

/* ---------- Lista do mini player ("Ao vivo e música"): edite só aqui ---------- */
// Cada item: id (vídeo do YouTube), canal (ao vivo do canal), ou url (abre no navegador).
// Nome, estilo e se é ao vivo. A ordem da lista é a ordem na tela; o 1º é o que o Reproduzir toca quando nada foi escolhido.
// O cartão comporta até 7 itens em 2 colunas, sem rolar. Todos conferidos no oEmbed em 06/11/2026.
var estacoes=[
  {url:'https://www.youtube.com/@CNNbrasil/live',nome:'CNN Brasil ao vivo',estilo:'notícias',aoVivo:true},
  {id:'qPgwDlqdiD0',nome:'Menos é Mais',estilo:'pagode',aoVivo:false},
  {id:'Nt27aBceerI',nome:'Rock clássico',estilo:'anos 70 a 90',aoVivo:true},
  {id:'rFZHOHl-L8A',nome:'Lofi para relaxar',estilo:'Lofi Girl',aoVivo:true},
  {id:'Dx5qFachd3A',nome:'Jazz no café',estilo:'piano jazz',aoVivo:true},
  {id:'4xDzrJKXOOY',nome:'Synthwave',estilo:'Lofi Girl',aoVivo:true},
  {id:'5yx6BWlEVcY',nome:'Chillhop',estilo:'jazzy lofi',aoVivo:true}
];
(function montarLista(){
  var controles=['video-play','video-pause','video-stop'];
  estacoes.forEach(function(s,i){
    var n=i+1,b=document.createElement('button'),nome=document.createElement('span'),linha=document.createElement('span'),estilo=document.createElement('span');
    b.id='estacao-'+n;b.className='estacao';
    b.setAttribute('data-faixa','outros');b.setAttribute('data-bloco','playlist');
    if(s.url)b.setAttribute('data-url',s.url);else if(s.canal)b.setAttribute('data-canal',s.canal);else b.setAttribute('data-video',s.id);
    // 2º, 4º e 6º itens ficam na coluna da esquerda: o ← volta ao botão do player da mesma altura.
    if(n%2===0&&controles[n/2-1])b.setAttribute('data-nav-left',controles[n/2-1]);
    nome.className='nome';nome.textContent=s.nome;
    linha.className='linha2';estilo.textContent=s.estilo;linha.appendChild(estilo);
    if(s.aoVivo){var tag=document.createElement('span');tag.className='ao-vivo';tag.textContent='ao vivo';linha.appendChild(tag);}
    b.appendChild(nome);b.appendChild(linha);
    $('playlist').appendChild(b);
  });
})();

/* Tela desenhada em px para 1920×1080. Se a TV informar outro tamanho (ex.: 1280×720),
   a página inteira ganha uma escala única, sem reorganizar o layout (ux.md R-M4). */
function escala(){var s=Math.min(window.innerWidth/1920,window.innerHeight/1080);document.body.style.transform=(s>0&&Math.abs(s-1)>0.01)?'scale('+s+')':'';}
escala();window.addEventListener('resize',escala);

/* ---------- Relógio e data (Brasília) ---------- */
function clock(){var now=new Date();$('clock').textContent=now.toLocaleTimeString('pt-BR',{timeZone:zone,hour:'2-digit',minute:'2-digit'});$('date').textContent=now.toLocaleDateString('pt-BR',{timeZone:zone,weekday:'long',day:'numeric',month:'long'});}
clock();setInterval(clock,1000);

/* ---------- Ícones (sprite SVG do index.html) ---------- */
function usar(svg,id){svg.querySelector('use').setAttribute('href','#'+id);}
function icone(id){var s=document.createElementNS(SVG,'svg'),u=document.createElementNS(SVG,'use');s.setAttribute('aria-hidden','true');u.setAttribute('href','#'+id);s.appendChild(u);return s;}

/* ---------- Linha D: todas as mensagens do painel ---------- */
// tipo: 'andamento' (menta, ícone girando), 'alerta' (âmbar, conexão) ou 'erro' (coral, falha).
var statusBox=$('status'), statusText=$('status-text'), statusIcon=$('status-icon');
function aviso(texto,tipo,simbolo){
  statusText.textContent=texto||'';
  statusBox.className=texto?(tipo||'andamento'):'';
  if(!texto)return;
  usar(statusIcon,simbolo||(tipo==='andamento'?'i-carregando':'i-alerta'));
  statusIcon.setAttribute('class','ico'+(tipo==='andamento'?' girando':''));
}

/* ---------- Previsão (Open-Meteo) ---------- */
function condition(c){if(c===0)return 'Céu limpo';if(c<=3)return 'Parcialmente nublado';if(c<=48)return 'Nevoeiro';if(c<=57)return 'Garoa';if(c<=67)return 'Chuva';if(c<=77)return 'Neve';if(c<=82)return 'Pancadas de chuva';if(c<=86)return 'Pancadas de neve';if(c>=95)return 'Trovoadas';return 'Condições variáveis';}
// Mesmos grupos do condition(); o 1–3 se divide só no ícone (design.md §3).
function iconFor(c){if(c===0)return 'i-sol';if(c<=2)return 'i-sol-nuvem';if(c===3)return 'i-nuvem';if(c<=48)return 'i-nevoeiro';if(c<=57)return 'i-garoa';if(c<=67)return 'i-chuva';if(c<=77)return 'i-neve';if(c<=82)return 'i-chuva';if(c<=86)return 'i-neve';if(c>=95)return 'i-trovoada';return 'i-nuvem';}
function render(data){
  if(!data.current||!data.daily||!Number.isFinite(data.current.temperature_2m))throw Error('Resposta incompleta');
  var c=data.current,d=data.daily,agora=$('weather-icon');
  $('temperature').textContent=Math.round(c.temperature_2m)+'°';$('temperature').className='';
  $('condition').textContent=condition(c.weather_code);$('condition').className='';
  usar(agora,iconFor(c.weather_code));agora.setAttribute('class','');
  $('details').textContent='Sensação de '+Math.round(c.apparent_temperature)+'° · Umidade '+c.relative_humidity_2m+'%';
  var box=$('forecast');box.textContent='';
  d.time.slice(0,7).forEach(function(date,i){
    var el=document.createElement('div');el.className=i===0?'day hoje':'day';
    var dia=document.createElement('b');dia.textContent=i===0?'Hoje':new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short'});el.appendChild(dia);
    if(d.weather_code&&Number.isFinite(d.weather_code[i]))el.appendChild(icone(iconFor(d.weather_code[i])));
    else{var ph=document.createElement('span');ph.className='ph';el.appendChild(ph);}
    var max=document.createElement('span');max.className='max';max.textContent=Math.round(d.temperature_2m_max[i])+'°';el.appendChild(max);
    var min=document.createElement('span');min.className='min';min.textContent=Math.round(d.temperature_2m_min[i])+'°';el.appendChild(min);
    box.appendChild(el);
  });
}
async function weather(){
  if(busy)return;busy=true;
  aviso('Atualizando previsão…','andamento');
  $('refresh-icon').setAttribute('class','ico girando');
  var controller=new AbortController(),timeout=setTimeout(function(){controller.abort();},15000);
  try{
    var response=await fetch('https://api.open-meteo.com/v1/forecast?latitude=-22.412&longitude=-42.966&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America%2FSao_Paulo&forecast_days=7',{signal:controller.signal});
    if(!response.ok)throw Error('HTTP '+response.status);
    var data=await response.json();
    render(data);
    lastFetch=Date.now();
    $('updated').textContent='Atualizado às '+new Date().toLocaleTimeString('pt-BR',{timeZone:zone,hour:'2-digit',minute:'2-digit'});$('updated').className='';
    aviso('');
  }catch(error){
    if(!lastFetch){
      aviso('Não foi possível atualizar. Confira a conexão e tente novamente.','alerta','i-sem-rede');
      $('condition').textContent='Sem conexão';$('condition').className='alerta';
      $('details').textContent='A previsão precisa de internet.';
      var agora=$('weather-icon');usar(agora,'i-sem-rede');agora.setAttribute('class','ico alerta');
    }else{
      aviso('Não foi possível atualizar. Confira a conexão e tente novamente.','alerta');
      $('updated').textContent='Dados anteriores — atualização indisponível';$('updated').className='alerta';
    }
  }finally{clearTimeout(timeout);busy=false;$('refresh-icon').setAttribute('class','ico');}
}

/* ---------- Atalhos ---------- */
// PalmServiceBridge is provided by the TV runtime; keep references until callbacks complete.
var bridges=[];
var services={music:{name:"YouTube Music",ids:["com.webos.app.browser"],url:"https://music.youtube.com/",params:{target:"https://music.youtube.com/"}},decisoes:{name:'Decisões',ids:['com.webos.app.browser'],url:'https://claude.ai/artifact/BFzdWoDNrbm5t8ZKjAasvi',params:{target:'https://claude.ai/artifact/BFzdWoDNrbm5t8ZKjAasvi'}},youtube:{name:'YouTube',ids:['youtube.leanback.v4'],url:'https://www.youtube.com/'},netflix:{name:'Netflix',ids:['netflix'],url:'https://www.netflix.com/'},hbo:{name:'HBO Max',ids:['com.wbd.stream','com.hbo.hbomax','hbo-go-2'],url:'https://www.hbomax.com/'},disney:{name:'Disney+',ids:['com.disney.disneyplus-prod','com.disney.disneyplus'],url:'https://www.disneyplus.com/'},paramount:{name:'Paramount+',ids:['com.cbs-all-access.webapp.prod'],url:'https://www.paramountplus.com/'}};
function launchService(service){
  if(typeof PalmServiceBridge==='undefined'){window.location.href=service.url;return;}
  var ids=service.ids.slice();
  function attempt(){
    var id=ids.shift();
    if(!id){aviso(service.name+' não encontrado. Instale o aplicativo pela loja da LG.','erro');return;}
    var bridge=new PalmServiceBridge();bridges.push(bridge);
    var timer=setTimeout(function(){aviso('A TV não confirmou a abertura de '+service.name+'.','erro');},12000);
    bridge.onservicecallback=function(raw){clearTimeout(timer);bridges=bridges.filter(function(x){return x!==bridge;});try{var result=JSON.parse(raw);if(result.returnValue){aviso('');}else if(result.errorCode===-101){attempt();}else{aviso('Não foi possível abrir '+service.name+'. '+(result.errorText||'Tente novamente.'),'erro');}}catch(e){aviso('Resposta inesperada da TV.','erro');}};
    try{bridge.call('luna://com.webos.applicationManager/launch',JSON.stringify({id:id,params:service.params||{}}));}catch(e){clearTimeout(timer);aviso('Não foi possível abrir '+service.name+'.','erro');}
  }
  aviso('Abrindo '+service.name+'…','andamento');
  attempt();
}
Object.keys(services).forEach(function(id){$(id).addEventListener('click',function(){launchService(services[id]);});});$('refresh').addEventListener('click',weather);

/* ---------- Navegação pelas setas (ux.md R-N1 a R-N5) ---------- */
// Vai para o item mais próximo na direção. ← e → só andam dentro da mesma faixa (data-faixa).
// ↑ e ↓ dentro da mesma faixa só andam no mesmo bloco (data-bloco: decisões, player, lista);
// entre faixas, vale o mais próximo. Exceções ficam no HTML: data-nav-left/right/up/down="id"
// (se o id não existir, por exemplo com menos itens na lista, vale o mais próximo).
var buttons=Array.prototype.slice.call(document.querySelectorAll('button'));
var direcao={37:'left',38:'up',39:'right',40:'down'};
function foco(el){if(el)el.focus({preventScroll:true});}
function mesmaFaixa(a,b){var fa=a.getAttribute('data-faixa'),fb=b.getAttribute('data-faixa');if(fa&&fb)return fa===fb;var ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();return ra.top<rb.bottom&&rb.top<ra.bottom;}
function mover(from,key){
  var excecao=$(from.getAttribute('data-nav-'+direcao[key])||'');
  if(excecao){foco(excecao);return;}
  var horizontal=key===37||key===39,origin=from.getBoundingClientRect(),ox=origin.left+origin.width/2,oy=origin.top+origin.height/2,best=null,score=Infinity;
  buttons.forEach(function(btn){
    if(btn===from)return;
    if(horizontal?!mesmaFaixa(from,btn):(mesmaFaixa(from,btn)&&from.getAttribute('data-bloco')!==btn.getAttribute('data-bloco')))return;
    var r=btn.getBoundingClientRect(),dx=r.left+r.width/2-ox,dy=r.top+r.height/2-oy,primary=(key===37?-dx:key===39?dx:key===38?-dy:dy),secondary=(horizontal?Math.abs(dy):Math.abs(dx));
    if(primary>10){var value=primary+secondary*3;if(value<score){score=value;best=btn;}}
  });
  if(best)foco(best);
}
document.addEventListener('keydown',function(e){
  var active=document.activeElement,key=e.keyCode;
  if(direcao[key]){
    e.preventDefault();
    if(buttons.indexOf(active)<0){foco($('youtube'));return;} // sempre há um item com foco (R-F5)
    mover(active,key);
  }else if(key===461){e.preventDefault();if(window.webOS&&window.webOS.platformBack)window.webOS.platformBack();else window.close();}
});
document.addEventListener('visibilitychange',function(){if(!document.hidden){clock();if(Date.now()-lastFetch>600000)weather();}});
foco($('youtube'));weather();setInterval(weather,900000);
})();
