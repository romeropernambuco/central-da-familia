// @ts-nocheck
// Personagens em pixel do Escritório da Família, copiados do app v23 (desenho 100% em código, original).
// sprite(id, dir, frame, pose) devolve um canvas 18x34; avatar(id) devolve um canvas 16x16.
var BRILHO = {};
export function marcarBrilho(ids){ BRILHO = {}; (ids||[]).forEach(function(i){ BRILHO[i]=1 }) }
var SPR={W:18,H:34,FOOT:33,SEAT_CROP:25};
var sprite,avatar;
(function(){
  var OUT="#1B1A24";
  function h2r(h){var n=parseInt(h.slice(1),16);return[n>>16,(n>>8)&255,n&255]}
  function r2h(r){return"#"+((1<<24)+(Math.round(r[0])<<16)+(Math.round(r[1])<<8)+Math.round(r[2])).toString(16).slice(1)}
  function mix(a,b,t){var x=h2r(a),y=h2r(b);return r2h([x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t])}
  function dk(c,t){return mix(c,"#24203A",t==null?.3:t)}   /* sombra: escurece puxando pro azul-violeta */
  function lt(c,t){return mix(c,"#FFF3D6",t==null?.28:t)}  /* luz: clareia puxando pro quente */
  function tri(c){return[lt(c),c,dk(c)]}

  /* ---------- paletas por funcionário ---------- */
  var P={
    contador:{skin:["#F8DCBC","#EDC29A","#CF9A74"],hair:["#5A4030","#3A281C","#21160F"],hs:"curto",
      top:tri("#3E6FB0"),pant:tri("#2C3350"),shoe:["#5A4636","#3A2C22","#22191A"],eye:"#22192A"},
    comprador:{skin:["#DDA97E","#C98E62","#A06844"],hair:["#8A6040","#5E3E26","#3E2716"],hs:"coque",
      top:tri("#F0E6D0"),apron:tri("#4E9A55"),pant:tri("#3D4D70"),shoe:["#8A5A3A","#6A4028","#432818"],eye:"#2A1A14"},
    auditor:{skin:["#F2C8A0","#E2AE84","#BF8860"],hair:["#4A4552","#2E2A34","#1F1C26"],hs:"raspado",
      top:tri("#ECEAF2"),vest:tri("#C0573F"),pant:tri("#6E5B44"),shoe:["#4A3A30","#2E241E","#1E1816"],eye:"#22192A"},
    cartao:{skin:["#F7D3B0","#EBBE96","#CC9670"],hair:["#B07A44","#8A5A2B","#5E3A1A"],hs:"longo",
      top:tri("#7A55A8"),inner:tri("#F2EADC"),pant:tri("#2E2A3E"),shoe:["#5E3048","#3E1E30","#26121E"],eye:"#2A1A24"},
    assistente:{skin:["#BD845C","#A86E48","#82512E"],hair:["#5E3E28","#3A2416","#24160C"],hs:"cacheado",
      top:tri("#D9739A"),inner:tri("#F6E3EA"),pant:tri("#4C6290"),shoe:["#E8E2D6","#C4BBAA","#8F8676"],eye:"#1E1410"},
    folha:{skin:["#F2CDA8","#E0B088","#BF8A62"],hair:["#7A5232","#55361E","#3A2414"],hs:"coque",
      top:tri("#5A6472"),pant:tri("#2E3440"),shoe:["#4A3A30","#2E241E","#1E1816"],eye:"#22192A"},
    vencimentos:{skin:["#BD845C","#A86E48","#82512E"],hair:["#4A3020","#2E1C12","#1C100A"],hs:"cacheado",
      top:tri("#F2EFE6"),vest:tri("#A3B23C"),pant:tri("#3D4D70"),shoe:["#6A4A32","#4A3222","#2A1C14"],eye:"#1E1410"},
    colchao:{skin:["#F2D3B0","#E3BC94","#C4966E"],hair:["#D6D5CF","#A8A7A1","#7A7974"],hs:"curto",
      top:tri("#6B4F3A"),pant:tri("#3A3328"),shoe:["#5A4636","#3A2C22","#22191A"],eye:"#22192A"},
    usina:{skin:["#DDA97E","#C98E62","#A06844"],hair:["#3A2818","#24180E","#140C06"],hs:"curto",
      top:tri("#B45309"),pant:tri("#3A3F4A"),shoe:["#5A4636","#3A2C22","#22191A"],eye:"#22192A"},
    presenca:{skin:["#C99068","#B07A52","#8A5A38"],hair:["#8A8078","#5E554E","#3A332E"],hs:"curto",
      top:tri("#E8ECEF"),vest:tri("#2E8B8B"),pant:tri("#3A3F4A"),shoe:["#4A3A30","#2E241E","#1E1816"],eye:"#22192A"},
    caixinha:{skin:["#E8B48A","#D49A70","#B07650"],hair:["#2A1E18","#1A120E","#0E0806"],hs:"longo",
      top:tri("#2D5B8C"),inner:tri("#F2EADC"),pant:tri("#3A3F4A"),shoe:["#5A4636","#3A2C22","#22191A"],eye:"#22192A"},
    tesoureiro:{skin:["#F2CDA8","#E3B48C","#C08B64"],hair:["#C9C8C2","#9A9993","#6E6D68"],hs:"grisalho",
      top:tri("#D9A23A"),inner:tri("#BFD4EA"),pant:tri("#4F4436"),shoe:["#6A4A32","#4A3222","#2A1C14"],eye:"#22192A"}
  };
  var PAPER=["#FFFFFF","#F1EDE2","#C9C2B2"],INK="#8C8678";

  /* ---------- buffer de pixels ---------- */
  var W=18,H=34,buf;
  function clr(){buf=[];for(var y=0;y<H;y++){buf.push(new Array(W).fill(null))}}
  function px(x,y,c){x+=1;y+=1;if(c&&x>=0&&y>=0&&x<W&&y<H)buf[y][x]=c}
  function rc(x,y,w,h,c){for(var j=0;j<h;j++)for(var i=0;i<w;i++)px(x+i,y+j,c)}
  function get(x,y){x+=1;y+=1;return(x>=0&&y>=0&&x<W&&y<H)?buf[y][x]:null}

  /* contorno de 1 px: tom bem escuro da cor vizinha (sel-out), externo puxado pro #1B1A24 */
  function outline(){var o=[];for(var y=0;y<H;y++){o.push(buf[y].slice())}
    for(var y=0;y<H;y++)for(var x=0;x<W;x++){if(buf[y][x])continue;var n=null;
      [[0,1],[0,-1],[1,0],[-1,0]].some(function(d){var yy=y+d[1],xx=x+d[0];if(yy>=0&&xx>=0&&yy<H&&xx<W&&buf[yy][xx]){n=buf[yy][xx];return true}return false});
      if(n)o[y][x]=mix(n,OUT,.8)}
    buf=o}
  function toCanvas(){var c=document.createElement("canvas");c.width=W;c.height=H;var g=c.getContext("2d");
    for(var y=0;y<H;y++)for(var x=0;x<W;x++)if(buf[y][x]){g.fillStyle=buf[y][x];g.fillRect(x,y,1,1)}return c}

  /* ---------- partes ---------- */
  /* pernas e sapatos. l1/l2 = levantar perna esquerda/direita (0 ou 1) */
  function legsFront(p,l1,l2,back,top0){var pa=p.pant,sh=p.shoe,t=top0==null?22:top0;
    /* esquerda (luz) */
    rc(4,t,4,30-t-l1,pa[1]);rc(4,t,1,30-t-l1,pa[0]);rc(7,t,1,30-t-l1,pa[2]);
    /* direita (sombra) */
    rc(8,t,4,30-t-l2,pa[1]);rc(11,t,1,30-t-l2,pa[2]);rc(8,t,1,30-t-l2,dk(pa[1],.45));
    rc(4,t,8,1,pa[2]);
    /* sapatos */
    var y1=30-l1,y2=30-l2;
    if(back){rc(4,y1,4,2,sh[1]);rc(4,y1+1,4,1,sh[2]);rc(8,y2,4,2,sh[1]);rc(8,y2+1,4,1,sh[2])}
    else{rc(3,y1,5,2,sh[1]);px(4,y1,sh[0]);rc(3,y1+1,5,1,sh[2]);rc(8,y2,5,2,sh[1]);px(9,y2,sh[0]);rc(8,y2+1,5,1,sh[2])}}
  /* perfil: a = deslocamento da perna da frente, b = da de trás (px no eixo x) */
  function legsSide(p,f,b,lf,lb){var pa=p.pant,sh=p.shoe;
    /* perna de trás (mais escura) */
    rc(6+b,22,3,8-lb,dk(pa[1],.25));rc(6+b,30-lb,4,2,sh[2]);px(9+b,30-lb,sh[2]);
    /* perna da frente */
    rc(7+f,22,3,8-lf,pa[1]);rc(7+f,22,1,8-lf,pa[0]);rc(9+f,22,1,8-lf,pa[2]);
    rc(7+f,30-lf,5,2,sh[1]);px(8+f,30-lf,sh[0]);rc(7+f,31-lf,5,1,sh[2])}

  function headFront(p,id,o,look){var s=p.skin,h=p.hair,y=o;
    /* rosto */
    rc(3,y+3,10,8,s[1]);rc(4,y+11,8,1,s[1]);
    rc(3,y+4,1,6,s[0]);rc(12,y+4,1,7,s[2]);rc(4,y+11,8,1,s[2]);px(11,y+10,s[2]);
    /* orelhas */
    px(2,y+7,s[1]);px(2,y+8,s[2]);px(13,y+7,s[2]);px(13,y+8,s[2]);
    /* olhos 2×2 com brilho, sobrancelhas, bochecha, boca */
    var E=p.eye,iris=mix(E,"#5A4A80",.35);
    if(look==="down"){rc(5,y+8,2,1,E);rc(9,y+8,2,1,E)}
    else{px(6,y+7,E);px(6,y+8,E);px(9,y+7,E);px(9,y+8,E);if(BRILHO[id]){px(7,y+7,"#FFFFFF");px(10,y+7,"#FFFFFF")}}
    var br=h[2];if(p.hs==="grisalho")br=h[1];
    rc(5,y+6,2,1,br);rc(9,y+6,2,1,br);
    px(4,y+9,mix(s[1],"#E0607A",.35));px(11,y+9,mix(s[2],"#E0607A",.3));
    if(p.hs==="grisalho"){rc(6,y+10,4,1,h[1]);px(6,y+10,h[0]);px(7,y+11,mix(s[2],"#7A2A30",.35))}
    else{px(7,y+10,mix(s[2],"#8A2A34",.45));px(8,y+10,mix(s[2],"#8A2A34",.3))}
    hairFront(p,y);
    if(id==="contador"||id==="colchao"){var F="#1E2238",G=mix("#BFE3F2",s[1],.45);
      var F2=mix(F,s[1],.55);rc(4,y+6,8,1,F);px(4,y+7,F);px(11,y+7,F);px(4,y+8,F2);px(11,y+8,F2);
      [[7,7],[7,8],[8,7],[8,8]].forEach(function(q){px(q[0],y+q[1],G)});px(7,y+7,mix("#FFFFFF",G,.4));
      rc(4,y+9,4,1,F2);rc(8,y+9,4,1,F2);
      px(5,y+5,h[2]);px(6,y+5,h[2]);px(9,y+5,h[2]);px(10,y+5,h[2])}}

  function hairFront(p,y){var h=p.hair,hs=p.hs;
    if(hs==="curto"){rc(4,y,8,1,h[1]);rc(3,y+1,10,1,h[1]);rc(2,y+2,12,2,h[1]);rc(3,y+4,3,1,h[1]);rc(9,y+4,4,1,h[1]);px(2,y+4,h[1]);px(13,y+4,h[2]);px(2,y+5,h[2]);px(13,y+5,h[2]);
      rc(4,y+1,4,1,h[0]);px(3,y+2,h[0]);px(5,y+2,"#7A5A44");rc(10,y+2,3,1,h[2]);px(12,y+3,h[2]);rc(6,y+3,1,1,h[2]);rc(6,y+4,3,1,dk(p.skin[1],.2))}
    else if(hs==="raspado"){rc(4,y+1,8,1,h[1]);rc(3,y+2,10,2,h[1]);px(2,y+3,h[2]);px(13,y+3,h[2]);rc(3,y+4,10,1,mix(h[1],p.skin[1],.45));
      rc(5,y+1,3,1,h[0]);px(4,y+2,h[0]);px(4,y+3,mix(h[0],p.skin[1],.3));rc(10,y+2,2,2,h[2]);
      px(4,y,null)}
    else if(hs==="coque"){rc(6,y,4,1,h[0]);rc(5,y+1,6,1,h[1]);px(6,y+1,h[0]);px(8,y+1,"#C9415A");px(9,y+1,"#C9415A");
      rc(3,y+2,10,2,h[1]);px(2,y+3,h[1]);px(13,y+3,h[2]);rc(2,y+4,2,4,h[1]);rc(12,y+4,2,4,h[2]);px(4,y+4,h[1]);px(11,y+4,h[1]);
      rc(4,y+2,3,1,h[0]);px(3,y+3,h[0]);px(7,y+3,h[2]);px(8,y+3,h[2]);rc(10,y+2,2,1,h[2]);rc(5,y+4,6,1,dk(p.skin[1],.15))}
    else if(hs==="longo"){rc(4,y,8,1,h[1]);rc(3,y+1,10,1,h[1]);rc(2,y+2,12,2,h[1]);
      rc(2,y+4,2,13,h[1]);rc(12,y+4,2,13,h[2]);px(1,y+6,h[1]);rc(1,y+7,1,9,h[1]);rc(14,y+7,1,9,h[2]);
      rc(4,y+4,5,1,h[1]);px(4,y+5,h[1]);px(11,y+4,h[1]);rc(9,y+4,2,1,h[1]);
      rc(4,y+1,4,1,h[0]);px(3,y+2,h[0]);px(4,y+2,"#D9A06A");rc(2,y+5,1,8,h[0]);rc(10,y+2,3,1,h[2]);rc(13,y+6,1,10,dk(h[2],.2));
      px(8,y+3,h[2]);px(1,y+16,null)}
    else if(hs==="cacheado"){
      rc(3,y,10,1,h[1]);rc(2,y+1,12,1,h[1]);rc(1,y+2,14,3,h[1]);rc(1,y+5,3,5,h[1]);rc(12,y+5,3,5,h[2]);rc(2,y+10,2,2,h[1]);rc(12,y+10,2,2,h[2]);
      px(4,y+5,h[1]);px(11,y+5,h[1]);px(6,y+5,h[1]);px(9,y+5,h[1]);px(2,y,null);
      /* cachos: brilhos em pontos e sombras em meia-lua */
      [[4,0],[2,2],[6,1],[3,4],[9,1],[1,6],[2,8],[12,3],[5,3],[8,3],[12,7]].forEach(function(q){px(q[0],y+q[1],h[0])});
      [[5,1],[3,3],[7,2],[10,2],[11,4],[13,6],[2,7],[13,9],[3,10],[7,4]].forEach(function(q){px(q[0],y+q[1],h[2])});px(4,y+1,"#8A6248")}
    else if(hs==="grisalho"){rc(4,y+1,8,1,h[1]);rc(3,y+2,10,1,h[1]);rc(2,y+3,3,3,h[1]);rc(11,y+3,3,3,h[2]);px(2,y+6,h[1]);px(13,y+6,h[2]);
      rc(5,y+3,6,1,mix(h[1],p.skin[1],.55));rc(5,y+1,3,1,h[0]);px(3,y+3,h[0]);rc(10,y+2,2,1,h[2]);px(4,y,null)}}

  function headBack(p,y){var h=p.hair,hs=p.hs,s=p.skin;
    /* nuca */
    rc(6,y+12,4,1,s[2]);
    if(hs==="curto"||hs==="raspado"||hs==="grisalho"){
      px(2,y+7,s[1]);px(2,y+8,s[2]);px(13,y+7,s[2]);px(13,y+8,s[2]);
      rc(4,y,8,1,h[1]);rc(3,y+1,10,1,h[1]);rc(2,y+2,12,5,h[1]);rc(3,y+7,10,3,h[1]);rc(4,y+10,8,1,h[2]);rc(5,y+11,6,1,hs==="raspado"?mix(h[2],s[1],.4):s[1]);
      rc(4,y+1,4,1,h[0]);rc(3,y+2,3,1,h[0]);px(3,y+3,h[0]);rc(12,y+2,1,6,h[2]);rc(11,y+7,2,3,h[2]);
      if(hs==="curto"){px(7,y+4,h[2]);px(8,y+5,h[2]);px(6,y+7,h[2]);px(9,y+7,h[2]);px(5,y+9,h[2]);px(10,y+9,h[2]);px(8,y+2,h[2])}
      if(hs==="raspado"){rc(3,y+8,10,2,mix(h[1],s[1],.18));rc(4,y+10,8,1,mix(h[1],s[1],.4));rc(5,y+11,6,1,mix(h[2],s[1],.6));px(6,y+3,h[0]);px(5,y+4,h[0])}
      if(hs==="grisalho"){[[6,4],[9,5],[7,7],[10,8],[5,8],[8,9],[4,6],[11,4]].forEach(function(q){px(q[0],y+q[1],h[2])});[[5,2],[6,2],[4,3],[7,5],[5,6],[9,3]].forEach(function(q){px(q[0],y+q[1],h[0])});px(5,y+2,"#ECEBE5")}}
    else if(hs==="coque"){rc(4,y+1,8,1,h[1]);rc(3,y+2,10,8,h[1]);rc(4,y+10,8,1,h[1]);rc(5,y+11,6,1,s[1]);
      px(2,y+7,s[1]);px(13,y+7,s[2]);
      rc(12,y+2,1,8,h[2]);rc(4,y+2,3,1,h[0]);px(3,y+3,h[0]);
      /* risco das mechas puxadas pro coque */
      px(4,y+5,h[2]);px(11,y+5,h[2]);px(5,y+8,h[2]);px(10,y+8,h[2]);px(4,y+9,h[2]);
      /* coque */
      var bn=mix(h[0],h[1],.35);rc(6,y+2,4,1,bn);rc(5,y+3,6,3,bn);rc(6,y+6,4,1,h[1]);px(6,y+3,lt(h[0],.25));px(7,y+2,lt(h[0],.2));rc(9,y+4,1,2,h[1]);px(8,y+5,h[1]);
      rc(6,y+7,4,1,"#C9415A");px(6,y+7,"#E06A80")}
    else if(hs==="longo"){rc(4,y,8,1,h[1]);rc(3,y+1,10,1,h[1]);rc(2,y+2,12,9,h[1]);rc(1,y+5,14,11,h[1]);rc(2,y+16,12,1,h[1]);rc(3,y+17,10,1,h[2]);
      rc(4,y+1,4,1,h[0]);rc(3,y+2,3,1,h[0]);rc(2,y+3,1,5,h[0]);rc(12,y+2,1,9,h[2]);rc(13,y+5,2,11,h[2]);
      [5,8,11].forEach(function(x){rc(x,y+6,1,9,h[2])});rc(6,y+4,1,10,h[0]);rc(3,y+8,1,7,h[0])}
    else if(hs==="cacheado"){rc(3,y,10,1,h[1]);rc(2,y+1,12,1,h[1]);rc(1,y+2,14,9,h[1]);rc(2,y+11,12,1,h[1]);rc(3,y+12,10,1,h[2]);
      [[4,0],[2,2],[6,1],[3,4],[9,1],[1,6],[2,8],[5,5],[8,6],[11,3],[4,9],[7,9],[10,8],[6,3]].forEach(function(q){px(q[0],y+q[1],h[0])});
      [[5,1],[3,3],[7,2],[10,2],[12,4],[13,6],[2,7],[13,9],[6,6],[9,7],[4,10],[8,10],[11,10],[7,4],[12,8]].forEach(function(q){px(q[0],y+q[1],h[2])})}}

  function headSide(p,id,y,look){var s=p.skin,h=p.hair,hs=p.hs;rc(7,y+12,3,1,s[2]);
    rc(4,y+2,8,9,s[1]);rc(5,y+11,6,1,s[2]);rc(12,y+4,1,6,s[1]);px(13,y+8,s[1]);px(13,y+9,s[2]);/* nariz de 1 px */
    rc(11,y+10,1,1,s[2]);px(12,y+10,s[2]);rc(5,y+11,6,1,s[2]);
    /* olho, sobrancelha, boca, bochecha */
    var E=p.eye;if(look==="down"){px(10,y+8,E);px(11,y+8,E)}else{px(10,y+7,E);px(10,y+8,E);if(BRILHO[id])px(11,y+7,"#FFFFFF")}
    rc(10,y+6,2,1,hs==="grisalho"?h[1]:h[2]);px(10,y+9,mix(s[1],"#E0607A",.35));
    if(hs==="grisalho"){rc(10,y+10,3,1,h[1]);px(12,y+10,h[0])}else px(12,y+10,mix(s[2],"#8A2A34",.4));
    /* orelha */
    px(6,y+7,s[2]);px(6,y+8,s[2]);px(7,y+7,s[1]);
    /* cabelo */
    if(hs==="curto"){rc(4,y,7,1,h[1]);rc(3,y+1,9,1,h[1]);rc(2,y+2,11,2,h[1]);rc(2,y+4,4,5,h[1]);rc(3,y+9,3,1,h[1]);rc(11,y+4,1,1,h[1]);rc(6,y+4,4,1,h[1]);
      rc(4,y+1,4,1,h[0]);px(3,y+2,h[0]);rc(2,y+5,1,3,h[2]);px(5,y+8,h[2]);px(12,y+3,h[2]);px(9,y+3,h[2])}
    else if(hs==="raspado"){rc(4,y+1,7,1,h[1]);rc(3,y+2,9,2,h[1]);rc(3,y+4,3,4,mix(h[1],s[1],.3));rc(3,y+8,3,1,mix(h[2],s[1],.45));rc(6,y+4,5,1,mix(h[1],s[1],.5));rc(4,y+1,3,1,h[0]);px(11,y+3,h[2])}
    else if(hs==="coque"){rc(4,y+1,7,1,h[1]);rc(3,y+2,9,2,h[1]);rc(2,y+4,4,5,h[1]);rc(6,y+4,4,1,dk(s[1],.15));
      rc(4,y+1,3,1,h[0]);px(3,y+3,h[0]);px(5,y+5,h[2]);px(4,y+7,h[2]);
      rc(0,y+1,3,4,h[1]);px(0,y+1,null);px(1,y+1,h[0]);px(0,y+2,h[0]);rc(1,y+4,2,1,h[2]);rc(3,y+1,1,4,"#C9415A")}
    else if(hs==="longo"){rc(4,y,7,1,h[1]);rc(3,y+1,9,1,h[1]);rc(2,y+2,11,2,h[1]);rc(1,y+4,5,12,h[1]);rc(2,y+16,4,1,h[2]);rc(6,y+4,4,1,h[1]);px(11,y+4,h[1]);px(10,y+5,h[1]);
      rc(4,y+1,4,1,h[0]);px(3,y+2,h[0]);rc(2,y+5,1,9,h[0]);rc(4,y+6,1,9,h[2]);px(12,y+3,h[2]);px(8,y+3,h[2])}
    else if(hs==="cacheado"){rc(3,y,8,1,h[1]);rc(2,y+1,10,1,h[1]);rc(1,y+2,12,3,h[1]);rc(0,y+4,6,7,h[1]);rc(1,y+11,4,1,h[2]);px(11,y+5,h[1]);rc(6,y+5,3,1,h[1]);
      [[3,0],[2,2],[5,1],[1,5],[3,6],[1,8],[8,2],[4,9]].forEach(function(q){px(q[0],y+q[1],h[0])});
      [[4,1],[3,3],[7,3],[2,6],[4,7],[2,9],[10,2],[5,10],[12,4]].forEach(function(q){px(q[0],y+q[1],h[2])})}
    else if(hs==="grisalho"){rc(5,y+1,6,1,h[1]);rc(3,y+2,8,1,h[1]);rc(2,y+3,4,6,h[1]);rc(3,y+9,3,1,h[2]);rc(5,y+1,3,1,h[0]);px(3,y+3,h[0]);px(4,y+6,h[2]);rc(6,y+3,5,1,mix(h[1],s[1],.5))}
    if(hs!=="cacheado"&&hs!=="longo"){px(6,y+7,s[1]);px(6,y+8,s[2])}
    if(id==="contador"||id==="colchao"){var F="#1E2238";rc(7,y+7,3,1,F);px(10,y+6,F);rc(10,y+6,2,1,F);px(12,y+7,F);px(12,y+8,F);rc(10,y+9,3,1,F);px(11,y+8,mix("#BFE3F2",s[1],.45));px(10,y+8,p.eye);px(11,y+7,"#FFFFFF")}}

  /* tronco de frente: devolve nada; desenha camisa e detalhes por função */
  function torsoFront(p,id,y,back){var t=p.top,yy=y;
    var main=p.apron||p.vest||t;
    /* ombros e tronco */
    rc(4,yy,8,9,t[1]);rc(3,yy+1,1,1,t[1]);rc(12,yy+1,1,1,t[2]);
    rc(4,yy,4,1,t[0]);rc(4,yy+1,1,7,t[0]);rc(11,yy+1,1,8,t[2]);rc(4,yy+8,8,1,t[2]);
    if(back){
      if(id==="contador"){rc(6,yy,4,1,"#E6ECF6");rc(7,yy+2,2,6,t[2]);rc(4,yy+8,8,1,"#2A2018")}
      else if(id==="comprador"){var a=p.apron;rc(5,yy,1,8,a[1]);rc(10,yy,1,8,a[2]);rc(4,yy+6,8,1,a[1]);px(7,yy+6,a[0]);px(8,yy+6,a[2]);px(7,yy+7,a[1]);px(8,yy+8,a[1])}
      else if((id==="auditor"||id==="presenca"||id==="vencimentos")){var v=p.vest;rc(4,yy,8,8,v[1]);rc(4,yy,1,8,v[0]);rc(11,yy,1,8,v[2]);rc(6,yy+5,4,1,v[2]);rc(6,yy,4,1,t[1]);rc(4,yy+8,8,1,"#3A2A20")}
      else if(id==="cartao"){rc(7,yy+1,2,7,t[2]);rc(5,yy+6,6,1,t[2])}
      else if(id==="assistente"){rc(5,yy,6,1,t[0]);rc(4,yy+8,8,1,t[2])}
      else if(id==="tesoureiro"){rc(6,yy,4,1,p.inner[1]);rc(4,yy+7,8,2,t[2]);for(var i=0;i<4;i++)px(5+i*2,yy+3+(i%2),t[2])}
      return}
    if(id==="contador"){var C="#EEF2FA",TI=["#C2464E","#9E2F38","#6E1E28"];
      px(6,yy,C);px(9,yy,C);px(6,yy+1,dk(C,.15));px(9,yy+1,dk(C,.15));rc(7,yy,2,1,TI[1]);px(7,yy,TI[0]);
      rc(7,yy+1,2,6,TI[1]);rc(7,yy+1,1,6,TI[0]);px(8,yy+7,TI[2]);px(7,yy+7,TI[1]);
      rc(4,yy+8,8,1,"#2A2018");px(7,yy+8,"#D9B45A");px(8,yy+8,"#A88830")}
    else if(id==="comprador"){var a=p.apron;
      /* blusa clara + avental verde (peitilho com bolso) */
      rc(5,yy,1,2,a[1]);rc(10,yy,1,2,a[2]);rc(5,yy+2,6,7,a[1]);rc(5,yy+2,1,7,a[0]);rc(10,yy+2,1,7,a[2]);rc(5,yy+2,6,1,a[0]);
      rc(6,yy+5,4,2,a[2]);rc(6,yy+5,4,1,dk(a[1],.45));px(7,yy+4,"#F2D04A");rc(4,yy+6,8,1,a[2])}
    else if((id==="auditor"||id==="presenca"||id==="vencimentos")){var v=p.vest;
      rc(4,yy,3,8,v[1]);rc(9,yy,3,8,v[1]);rc(4,yy,1,8,v[0]);rc(11,yy,1,8,v[2]);px(6,yy+4,v[1]);px(9,yy+4,v[1]);rc(7,yy+5,2,3,v[1]);
      px(6,yy,t[0]);px(9,yy,t[1]);px(7,yy+3,v[2]);px(8,yy+4,v[2]);px(8,yy+6,v[2]);px(7,yy+8,v[1]);px(8,yy+8,v[2]);
      rc(6,yy+1,1,3,dk(v[1],.15));rc(4,yy+8,3,1,v[2]);rc(9,yy+8,3,1,v[2]);px(10,yy+3,dk(v[1],.4));if(id==="presenca"){rc(9,yy+2,2,3,"#F4F4F7");px(9,yy+2,"#3E6FB0");px(10,yy+2,"#3E6FB0");px(9,yy+4,"#8C8678");px(9,yy+1,"#2B2D3A")}}
    else if(id==="cartao"){var n=p.inner;
      rc(7,yy,2,4,n[1]);px(7,yy,n[0]);px(7,yy+4,n[2]);px(8,yy+4,n[2]);px(8,yy+1,n[2]);
      rc(6,yy,1,5,t[0]);rc(9,yy,1,5,t[2]);px(6,yy+5,t[0]);px(9,yy+5,dk(t[1],.45));
      px(8,yy+6,"#E8C25A");rc(7,yy+5,1,4,dk(t[1],.4));rc(5,yy+7,1,1,dk(t[1],.4));rc(10,yy+7,1,1,t[2])}
    else if(id==="assistente"){var n=p.inner;
      rc(6,yy,4,1,n[1]);rc(7,yy+1,2,1,n[1]);px(7,yy+2,"#E8C25A");px(8,yy+2,"#B8902E");
      rc(5,yy+4,6,1,t[2]);px(5,yy+4,t[1]);rc(4,yy+5,8,4,dk(t[1],.08));rc(4,yy+5,1,3,t[0]);rc(4,yy+8,8,1,t[2])}
    else if(id==="tesoureiro"){var n=p.inner;
      rc(7,yy,2,9,n[1]);px(7,yy,n[0]);px(8,yy,n[2]);px(6,yy,"#F2F4F8");px(9,yy,"#D6DCE6");rc(8,yy+1,1,8,n[2]);
      [2,4,6].forEach(function(k){px(6,yy+k,"#7A5A20")});rc(4,yy+6,2,2,t[2]);rc(10,yy+6,2,2,dk(t[2],.2));rc(4,yy+8,8,1,dk(t[1],.4))}}

  /* braços de frente. dy1/dy2: deslocamento vertical da mão (balanço) */
  function armsFront(p,id,y,mode,f){var t=p.top,s=p.skin,sl=t;
    var short=id==="comprador";
    function arm(x,side,len,hand){
      for(var k=0;k<len;k++){var sk=short&&k>=3;
        if(sk){rc(x,y+1+k,2,1,side?s[1]:s[1]);px(side?x+1:x,y+1+k,side?s[2]:s[0])}
        else{rc(x,y+1+k,2,1,t[1]);if(side)px(x+1,y+1+k,t[2]);else px(x,y+1+k,t[0])}}
      if(hand){rc(x,y+1+len,2,2,s[1]);px(side?x+1:x,y+1+len,side?s[2]:s[0]);px(side?x:x+1,y+2+len,s[2])}}
    if(mode==="stand"||mode==="walk"){var a=f||0;arm(2,0,7+a,1);arm(12,1,7-a,1)}
    else if(mode==="type"){var u=f?1:0;
      /* cotovelos pra fora, antebraço na frente da barriga; mãos alternando */
      arm(2,0,5,0);arm(12,1,5,0);rc(3,y+6,3,2,sl[1]);rc(10,y+6,3,2,sl[2]);
      rc(5,y+6-u,2,2,s[1]);px(5,y+7-u,s[0]);rc(9,y+6-(1-u),2,2,s[2])}
    else if(mode==="read"){arm(2,0,4,0);arm(12,1,4,0);rc(3,y+5,2,2,sl[1]);rc(11,y+5,2,2,sl[2]);
      /* folha segurada com as duas mãos */
      rc(4,y+2,8,7,PAPER[1]);rc(4,y+2,8,1,PAPER[0]);rc(11,y+3,1,6,PAPER[2]);rc(5,y+4,5,1,INK);rc(5,y+6,4,1,INK);px(9,y+6,mix(t[1],INK,.3));
      rc(4,y+5,2,2,s[1]);rc(10,y+5,2,2,s[2])}
    else if(mode==="cup"){arm(2,0,7,1);arm(12,1,4,0);rc(10,y+5,2,2,sl[2]);
      /* xícara na mão direita, na altura do peito */
      rc(9,y+4,4,4,"#F4F1E8");rc(9,y+4,4,1,"#6A3E22");px(12,y+5,"#C9C2B2");px(13,y+5,"#F4F1E8");px(13,y+6,"#C9C2B2");rc(9,y+7,4,1,"#C9C2B2");
      rc(9,y+8,2,1,s[2]);px(9,y+2,"#E6E2DA");px(10,y+1,"#E6E2DA")}
    else if(mode==="paper"){arm(2,0,7,1);arm(12,1,4,0);
      /* pasta/papel carregado junto ao corpo */
      rc(10,y+3,5,7,PAPER[1]);rc(10,y+3,5,1,PAPER[0]);rc(14,y+4,1,6,PAPER[2]);rc(11,y+5,3,1,INK);rc(11,y+7,2,1,INK);rc(12,y+9,2,2,s[2])}}

  /* ---------- montagem ---------- */
  function draw(id,dir,frame,pose){var p=P[id]||P.contador;clr();
    var walk=pose==="walk",bob=walk&&(frame===0||frame===2)?1:0;
    var l1=0,l2=0;if(walk){if(frame===0)l2=1;else if(frame===2)l1=1}
    var hy=0+bob,ty=13+bob;
    if(dir==="d"||dir==="u"){var back=dir==="u";
      /* cabelo longo atrás do corpo (frente) */
      legsFront(p,l1,l2,back,22);
      if(id==="comprador"&&!back){var a=p.apron;rc(4,22,8,4,a[1]);rc(4,22,1,4,a[0]);rc(11,22,1,4,a[2]);rc(4,25,8,1,a[2])}
      torsoFront(p,id,ty,back);
      var mode=walk?"walk":(pose==="type"||pose==="read"||pose==="cup"||pose==="paper"?pose:"stand");
      if(back){var t=p.top,s=p.skin,sw=walk?(frame===0?1:(frame===2?-1:0)):0;
        var la=mode==="stand"||mode==="walk"?7+sw:(mode==="type"?5:4),ra=mode==="stand"||mode==="walk"?7-sw:(mode==="type"?5:(mode==="cup"||mode==="paper"?4:4));
        if(mode==="cup"||mode==="paper")la=7;
        var short=id==="comprador";
        function barm(x,len,side){for(var k=0;k<len;k++){var sk=short&&k>=3;rc(x,ty+1+k,2,1,sk?s[1]:t[1]);px(side?x+1:x,ty+1+k,sk?(side?s[2]:s[0]):(side?t[2]:t[0]))}if(len>=7){rc(x,ty+1+len,2,2,s[1]);px(side?x+1:x,ty+2+len,s[2])}}
        barm(2,la,0);barm(12,ra,1);
        if(mode==="read"){rc(1,ty+4,1,4,PAPER[1]);rc(14,ty+4,1,4,PAPER[2])}
        if(mode==="paper"){rc(14,ty+3,1,6,PAPER[1])}
        if(mode==="type"){rc(3,ty+6,2,1,t[1]);rc(11,ty+6,2,1,t[2])}
        headBack(p,hy);
        if((id==="auditor"||id==="presenca"||id==="vencimentos")&&(mode==="stand"||mode==="walk")){rc(13,ty+3,2,6,"#8A5A34")}
      }else{
        var f=0;if(walk)f=frame===0?1:(frame===2?-1:0);
        if(id==="cartao"){var h=p.hair;rc(2,hy+12,2,5,h[1]);rc(12,hy+12,2,5,h[2])}
        armsFront(p,id,ty,mode,f);
        if((id==="auditor"||id==="presenca"||id==="vencimentos")&&(mode==="stand"||mode==="walk")){
          /* prancheta encostada no braço direito */
          var cy=ty+3+(walk?-f:0);rc(11,cy,4,7,"#9C6B43");rc(11,cy,1,7,"#B8865A");rc(12,cy+1,3,5,PAPER[1]);rc(12,cy+2,2,1,INK);rc(12,cy+4,2,1,INK);rc(12,cy-1,2,2,"#9AA0AE");px(12,cy-1,"#D6DAE2")}
        headFront(p,id,hy,null);
        if(id==="cartao"){var h=p.hair;rc(2,hy+12,1,5,h[0])}
      }
    }else{/* perfil, olhando pra direita */
      var fA=0,bA=0,lf=0,lb=0;
      if(walk){if(frame===0){fA=2;bA=-2;lb=1}else if(frame===2){fA=-2;bA=2;lf=1}}
      var t=p.top,s=p.skin;
      /* braço de trás */
      var bsw=walk?(frame===0?-1:(frame===2?1:0)):0;
      if(pose==="stand"||walk){rc(6+bsw,ty+1,2,7,dk(t[1],.35));rc(6+bsw,ty+8,2,2,dk(s[1],.25))}
      legsSide(p,fA,bA,lf,lb);
      /* tronco */
      rc(5,ty,6,9,t[1]);rc(5,ty,6,1,t[0]);rc(5,ty+1,1,7,t[2]);rc(5,ty+8,6,1,t[2]);rc(10,ty+1,1,7,t[1]);
      if(id==="contador"){px(10,ty,"#EEF2FA");rc(10,ty+1,1,6,"#9E2F38");px(10,ty+1,"#C2464E");rc(5,ty+8,6,1,"#2A2018")}
      else if(id==="comprador"){var a=p.apron;rc(9,ty+2,2,11,a[1]);rc(9,ty+2,2,1,a[0]);rc(10,ty+3,1,10,a[2]);rc(9,ty,1,2,a[1]);px(5,ty+6,a[1]);px(4,ty+7,a[2]);px(5,ty+7,a[2])}
      else if((id==="auditor"||id==="presenca"||id==="vencimentos")){var v=p.vest;rc(5,ty,6,8,v[1]);rc(5,ty,6,1,v[0]);rc(10,ty,1,2,t[0]);px(10,ty+3,v[2]);px(10,ty+5,v[2]);rc(5,ty+1,1,7,v[2]);rc(5,ty+8,6,1,"#3A2A20")}
      else if(id==="cartao"){rc(10,ty,1,4,p.inner[1]);px(9,ty+1,t[0]);px(9,ty+2,t[0]);px(10,ty+5,"#E8C25A")}
      else if(id==="assistente"){rc(9,ty,2,1,p.inner[1]);rc(5,ty+5,6,1,t[2])}
      else if(id==="tesoureiro"){rc(10,ty,1,9,p.inner[1]);px(10,ty,"#F2F4F8");rc(9,ty+6,1,2,dk(t[2],.2))}
      headSide(p,id,hy,null);
      /* braço da frente */
      var sl=t,ax=7,shortA=id==="comprador";
      function farm(x,y,len,col){for(var k=0;k<len;k++){rc(x,y+k,2,1,shortA&&k>=3?s[1]:col)}}
      if(pose==="stand"||walk){var sw=walk?(frame===0?2:(frame===2?-2:0)):0,dx=sw>0?1:(sw<0?-1:0);
        farm(ax,ty+1,3,sl[0]);farm(ax+dx,ty+4,4,sl[1]);px(ax+dx+1,ty+4,dk(sl[1],.12));rc(ax+dx*2,ty+8,2,2,s[1]);px(ax+dx*2,ty+9,s[0]);
        if((id==="auditor"||id==="presenca"||id==="vencimentos")){var cy=ty+3;rc(ax-1,cy,2,8,"#9C6B43");rc(ax-1,cy,1,8,"#B8865A")}}
      else if(pose==="type"){var u=frame?1:0;farm(ax,ty+1,4,sl[0]);rc(ax+1,ty+5,3,2,sl[1]);rc(ax+4,ty+5-u,2,2,s[1])}
      else if(pose==="read"){farm(ax,ty+1,4,sl[0]);rc(ax+1,ty+4,3,2,sl[1]);rc(11,ty-1,3,8,PAPER[1]);rc(11,ty-1,3,1,PAPER[0]);rc(13,ty,1,7,PAPER[2]);rc(11,ty+3,2,2,s[1])}
      else if(pose==="cup"){farm(ax,ty+1,4,sl[0]);rc(ax+1,ty+4,3,2,sl[1]);rc(11,ty+2,3,3,"#F4F1E8");rc(11,ty+2,3,1,"#6A3E22");rc(11,ty+5,3,1,"#C9C2B2");px(10,ty+3,"#C9C2B2");rc(10,ty+4,2,2,s[1]);px(12,ty,"#E6E2DA")}
      else if(pose==="paper"){farm(ax,ty+1,4,sl[0]);rc(ax+1,ty+4,3,2,sl[1]);rc(9,ty+1,5,6,PAPER[1]);rc(9,ty+1,5,1,PAPER[0]);rc(10,ty+3,3,1,INK);rc(11,ty+4,2,2,s[1])}
    }
    outline();return toCanvas()}

  var cache={};
  sprite=function(id,dir,frame,pose){pose=pose||"stand";frame=frame||0;var key=id+"|"+dir+"|"+frame+"|"+pose+(BRILHO[id]?"|b":"");if(cache[key])return cache[key];
    var c;
    if(dir==="l"){var r=sprite(id,"r",frame,pose);c=document.createElement("canvas");c.width=W;c.height=H;var g=c.getContext("2d");g.translate(W,0);g.scale(-1,1);g.drawImage(r,0,0)}
    else c=draw(id,dir==="u"||dir==="r"?dir:"d",frame,pose);
    cache[key]=c;return c};

  /* avatar 16×16: rosto e ombros, recorte do sprite de frente com fundo da cor da função */
  var acache={};
  avatar=function(id){if(acache[id])return acache[id];var p=P[id]||P.contador,s=sprite(id,"d",0,"stand");
    var c=document.createElement("canvas");c.width=16;c.height=16;var g=c.getContext("2d");g.imageSmoothingEnabled=false;
    var base=(p.apron||p.vest||p.top)[1];g.fillStyle=mix(base,"#1B1A24",.55);g.fillRect(0,0,16,16);g.fillStyle=mix(base,"#1B1A24",.35);g.fillRect(0,0,16,6);
    var top=(p.hs==="cacheado"||p.hs==="coque")?0:1;g.drawImage(s,1,top,16,16,0,1,16,16);acache[id]=c;return c};
})();
export { SPR, sprite, avatar };
