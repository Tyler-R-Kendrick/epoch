/* Vendored from CanvasUI (canvasui.dev) — registry item "asciify-vanilla", zero dependencies.
   Source: https://canvasui.dev/r/asciify-vanilla.json → components/canvasui/AsciifyVanilla.ts
   Rebuild: fetch that item, write its single file, and bundle it with esbuild as an IIFE
   exposing { createAsciify, supportsHtmlInCanvas } on window.Asciify.
   Requires HTML-in-canvas (<canvas layoutsubtree>), which is flag-gated in Chromium. */
(()=>{var Lt={ascii:[0,128,131200,14336,459200,469440,4357252,18157905,11512810,15724526],blocks:[0,328e3,22041621,22369621,11512810,33554431],binary:[0,4591758,15324974]},mt=16,At=500,It={radius:.4,softness:1,scale:2,spacing:1,charset:"ascii",glyphs:[],background:[0,0,0],backgroundOpacity:0,contrast:1,brightness:0,invert:0,strength:1,baseStrength:0,followSpeed:3,glow:.75,aberration:.75},Ot=`#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`,Nt=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform vec2 uContentOffset;
uniform vec2 uResolution;
uniform float uGlyphPx;
uniform float uSpacing;
uniform uint uGlyphs[${mt}];
uniform int uGlyphCount;
uniform float uRadius;
uniform float uSoftness;
uniform vec2 uPointer;
uniform float uActive;
uniform vec3 uBg;
uniform float uBackingLum;
uniform float uBgOpacity;
uniform float uLod;
uniform float uContrast;
uniform float uBrightness;
uniform float uInvert;
uniform float uStrength;
uniform float uBase;
uniform float uMaxX;
uniform sampler2D uTextMask;
uniform float uDotPx;
uniform float uDotLod;
uniform float uGlowAmt;
uniform float uAberration;

#define S(a, b, t) smoothstep(a, b, t)

float glyphBit (int index, ivec2 p) {
  if (p.x < 0 || p.x > 4 || p.y < 0 || p.y > 4) return 0.0;
  uint bits = uGlyphs[index];
  return float((bits >> uint((4 - p.x) + 5 * p.y)) & 1u);
}

float hash21 (vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec4 sampleFringe (vec2 uv, float lod, vec2 off) {
  vec4 c = textureLod(uContent, uv, lod);
  c.r = textureLod(uContent, uv + off, lod).r;
  c.b = textureLod(uContent, uv - off, lod).b;
  return c;
}

void main () {
  vec2 uv = vUv;

  if (uv.x > uMaxX) {
    outColor = vec4(0.0);
    return;
  }

  float cellPx = (5.0 + 2.0 * uSpacing) * uGlyphPx;
  vec2 frag = uv * uResolution;
  vec2 cell = floor(frag / cellPx);
  vec2 cellUv = (cell + 0.5) * cellPx / uResolution;

  float aspect = uResolution.x / uResolution.y;
  float dist = length((cellUv - uPointer) * vec2(aspect, 1.0));
  float radius = max(uRadius * uActive, 1e-4);
  float inner = radius * (1.0 - clamp(uSoftness, 0.0, 1.0));
  float lens = (1.0 - S(inner, radius, dist)) * uActive;
  float mask = clamp(max(lens, clamp(uBase, 0.0, 1.0)), 0.0, 1.0)
    * clamp(uStrength, 0.0, 1.0);

  float apply = mask < 0.003 ? 0.0 : step(hash21(cell), mask);

  if (apply < 0.5) {
    outColor = vec4(0.0);
    return;
  }

  vec2 textureUv = vec2(cellUv.x, 1.0 - cellUv.y) + uContentOffset;
  if (textureUv.x < 0.001 || textureUv.x > uMaxX - 0.002 ||
      textureUv.y < 0.001 || textureUv.y > 0.999) {
    outColor = vec4(0.0);
    return;
  }

  vec2 lensDir = (cellUv - uPointer) * vec2(aspect, 1.0);
  float fringeAmp = max(uActive, S(0.0, 0.25, uBase));
  vec2 fringe = normalize(lensDir + 1e-5)
    * clamp(uAberration, 0.0, 1.0) * 0.005
    * S(uRadius * 0.15, uRadius, dist) * fringeAmp;
  fringe = vec2(fringe.x / aspect, -fringe.y);

  float textness = texture(uTextMask, vec2(cellUv.x, 1.0 - cellUv.y)).r;

  if (textness > 0.4) {
    vec2 dotIdx = floor(frag / uDotPx);
    vec2 dotUv = (dotIdx + 0.5) * uDotPx / uResolution;
    vec2 flippedUv = clamp(
      vec2(dotUv.x, 1.0 - dotUv.y) + uContentOffset,
      vec2(0.001), vec2(uMaxX - 0.002, 0.999));
    vec4 ink = sampleFringe(flippedUv, uDotLod, fringe);
    float inkLum = dot(ink.rgb, vec3(0.299, 0.587, 0.114));
    float density = abs(inkLum - uBackingLum);
    density = clamp((density - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);
    density = mix(density, 1.0 - density, clamp(uInvert, 0.0, 1.0));
    float d = length(frag - (dotIdx + 0.5) * uDotPx) / (uDotPx * 0.5);
    float reach = sqrt(density);
    float on = (1.0 - S(reach - 0.3, reach + 0.2, d)) * step(0.03, density);
    vec3 inkColor = clamp(
      uBg + (ink.rgb - uBg) / max(abs(inkLum - uBackingLum), 0.2),
      0.0, 1.0);
    vec4 soft = sampleFringe(flippedUv, uDotLod + 2.5, fringe);
    float softLum = dot(soft.rgb, vec3(0.299, 0.587, 0.114));
    float halo = clamp(abs(softLum - uBackingLum) * 2.2, 0.0, 1.0)
      * clamp(uGlowAmt, 0.0, 1.0) * 0.55;
    vec3 haloColor = clamp(
      uBg + (soft.rgb - uBg) / max(abs(softLum - uBackingLum), 0.2),
      0.0, 1.0);
    vec3 col = mix(haloColor, inkColor, on);
    float alpha = ink.a
      * max(mix(clamp(uBgOpacity, 0.0, 1.0), 1.0, on), halo * (1.0 - on));
    outColor = vec4(col * alpha, alpha);
    return;
  }

  vec4 pixel = sampleFringe(textureUv, uLod, fringe);

  float lum = dot(pixel.rgb, vec3(0.299, 0.587, 0.114));
  float amount = abs(lum - uBackingLum);
  amount = clamp((amount - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);
  amount = mix(amount, 1.0 - amount, clamp(uInvert, 0.0, 1.0));

  int index = min(int(amount * float(uGlyphCount)), uGlyphCount - 1);

  ivec2 local = ivec2(floor((frag - cell * cellPx) / uGlyphPx));
  int pad = int(uSpacing);
  float on = glyphBit(index, ivec2(local.x - pad, local.y - pad));

  vec3 glyphColor = clamp(
    uBg + (pixel.rgb - uBg) / max(abs(lum - uBackingLum), 0.2),
    0.0, 1.0);
  vec3 col = mix(uBg, glyphColor, on);
  float alpha = pixel.a * mix(clamp(uBgOpacity, 0.0, 1.0), 1.0, on);
  outColor = vec4(col * alpha, alpha);
}`;function kt(){if(typeof document>"u")return!1;let r=document.createElement("canvas"),a=r.getContext("2d");return!!(a&&typeof a.drawElementImage=="function"&&typeof r.requestPaint=="function")}function Xt(r,a){return{left:Math.max(r.left,a.left),top:Math.max(r.top,a.top),right:Math.min(r.right,a.right),bottom:Math.min(r.bottom,a.bottom)}}function Gt(r,a){let e=r.getBoundingClientRect(),c=Math.min(window.devicePixelRatio||1,2),o=Math.max(1,Math.round(e.width*c)),i=Math.max(1,Math.round(e.height*c));(a.width!==o||a.height!==i)&&(a.width=o,a.height=i);let t=a.getContext("2d");if(!t)throw new Error("2D canvas is unavailable");t.resetTransform(),t.clearRect(0,0,o,i),t.scale(c,c);let v={left:e.left,top:e.top,right:e.right,bottom:e.bottom},M=new WeakMap;function b(x){let s=M.get(x);if(s)return s;let m=x.parentElement,g=m&&r.contains(m)?b(m):null,p=getComputedStyle(x),y=Number.parseFloat(p.opacity),f=(g?.opacity??1)*(Number.isFinite(y)?y:1),T=(g?.visible??!0)&&p.display!=="none"&&p.visibility!=="hidden"&&p.visibility!=="collapse"&&f>0,U=g?.childrenClip??v,L=x.getBoundingClientRect(),A={...U};p.overflowX!=="visible"&&(A.left=Math.max(A.left,L.left),A.right=Math.min(A.right,L.right)),p.overflowY!=="visible"&&(A.top=Math.max(A.top,L.top),A.bottom=Math.min(A.bottom,L.bottom));let F={style:p,visible:T,opacity:f,clip:U,childrenClip:A};return M.set(x,F),F}let C=document.createTreeWalker(r,NodeFilter.SHOW_ELEMENT),R=C.currentNode;for(;R;){let x=R,s=x.getBoundingClientRect(),m=b(x),g=Xt(s,m.clip);if(m.visible&&g.right>g.left&&g.bottom>g.top){let{style:p}=m;t.save(),t.beginPath(),t.rect(m.clip.left-e.left,m.clip.top-e.top,m.clip.right-m.clip.left,m.clip.bottom-m.clip.top),t.clip(),t.globalAlpha=m.opacity;let y=s.left-e.left,f=s.top-e.top;p.backgroundColor!=="transparent"&&(t.fillStyle=p.backgroundColor,t.fillRect(y,f,s.width,s.height)),Ht(t,x,p,s,e),qt(t,x,p,e),Vt(t,p,s,e),t.restore()}R=C.nextNode()}t.globalAlpha=1}function Ht(r,a,e,c,o){let i=a instanceof HTMLImageElement?a.complete&&a.naturalWidth>0?a:null:a instanceof HTMLCanvasElement||a instanceof HTMLVideoElement&&a.readyState>=2?a:null;if(!i||!Wt(i))return;let t=i instanceof HTMLImageElement?i.naturalWidth:i instanceof HTMLVideoElement?i.videoWidth:i.width,v=i instanceof HTMLImageElement?i.naturalHeight:i instanceof HTMLVideoElement?i.videoHeight:i.height;if(!(t>0&&v>0))return;let M=0,b=0,C=t,R=v,x=c.left-o.left,s=c.top-o.top,m=c.width,g=c.height,[p,y]=Yt(e.objectPosition);if(e.objectFit==="cover"){let f=Math.max(c.width/t,c.height/v);C=c.width/f,R=c.height/f,M=(t-C)*p,b=(v-R)*y}else if(e.objectFit==="contain"||e.objectFit==="scale-down"){let f=Math.min(c.width/t,c.height/v,e.objectFit==="scale-down"?1:Number.POSITIVE_INFINITY);m=t*f,g=v*f,x+=(c.width-m)*p,s+=(c.height-g)*y}try{r.drawImage(i,M,b,C,R,x,s,m,g)}catch{}}function Wt(r){let a=document.createElement("canvas");a.width=a.height=1;let e=a.getContext("2d",{willReadFrequently:!0});if(!e)return!1;try{return e.drawImage(r,0,0,1,1),e.getImageData(0,0,1,1),!0}catch{return!1}}function Yt(r){let[a="50%",e="50%"]=r.split(/\s+/);return[St(a,"left","right"),St(e,"top","bottom")]}function St(r,a,e){return r===a?0:r===e?1:r==="center"?.5:r.endsWith("%")?Math.min(1,Math.max(0,Number.parseFloat(r)/100)):.5}function qt(r,a,e,c){let o=Array.from(a.childNodes).filter(s=>s.nodeType===Node.TEXT_NODE&&s.textContent?.trim());if(o.length===0)return;r.fillStyle=e.color,r.font=`${e.fontStyle} ${e.fontWeight} ${e.fontSize} ${e.fontFamily}`,r.textBaseline="alphabetic","letterSpacing"in r&&(r.letterSpacing=e.letterSpacing==="normal"?"0px":e.letterSpacing);let i=e.textAlign==="center"||e.textAlign==="right"||e.textAlign==="start"||e.textAlign==="end"?e.textAlign:"left",t=e.direction==="rtl"?"rtl":"ltr";r.textAlign=i,r.direction=t;let v=e.whiteSpace,M=v==="pre"||v==="pre-wrap"||v==="pre-line"||v==="break-spaces",b=M&&v!=="pre-line",C=i==="center"?.5:i==="right"||i==="end"&&t==="ltr"||i==="start"&&t==="rtl"?1:0;function R(s){return e.textTransform==="uppercase"?s.toUpperCase():e.textTransform==="lowercase"?s.toLowerCase():s}function x(s,m){let g=m.filter(f=>f.right>c.left&&f.left<c.right&&f.bottom>c.top&&f.top<c.bottom);if(g.length===0)return;let p=g.reduce((f,T)=>f+T.width,0),y=0;for(let f=0;f<g.length;f++){let T=g[f],U=s.length-y;if(U<=0)break;let L=f===g.length-1?U:Math.min(U,Math.max(1,Math.round(s.length*T.width/p))),A=s.slice(y,y+L);y+=L;let F=b?A:A.trim();if(!F.trim())continue;let Y=T.left-c.left+T.width*C,X=r.measureText(F),S=X.fontBoundingBoxAscent??0,d=X.fontBoundingBoxDescent??0,et=S>0?T.top-c.top+(T.height-S-d)/2+S:T.bottom-c.top-T.height*.2;r.fillText(F,Y,et,Math.max(T.width,1))}}for(let s of o){let m=s.textContent??"",g=document.createRange();if(M){let y=0;for(let f of m.split(`
`)){let T=y;if(y+=f.length+1,!f.trim())continue;g.setStart(s,T),g.setEnd(s,T+f.length);let U=R(b?f:f.replace(/\s+/g," ").trim());x(U,Array.from(g.getClientRects()))}continue}let p=R(m.replace(/\s+/g," ").trim());p&&(g.selectNodeContents(s),x(p,Array.from(g.getClientRects())))}}function Vt(r,a,e,c){let o=e.left-c.left,i=e.top-c.top,t=Number.parseFloat(a.borderTopWidth),v=Number.parseFloat(a.borderRightWidth),M=Number.parseFloat(a.borderBottomWidth),b=Number.parseFloat(a.borderLeftWidth);t>0&&(r.fillStyle=a.borderTopColor,r.fillRect(o,i,e.width,t)),v>0&&(r.fillStyle=a.borderRightColor,r.fillRect(o+e.width-v,i,v,e.height)),M>0&&(r.fillStyle=a.borderBottomColor,r.fillRect(o,i+e.height-M,e.width,M)),b>0&&(r.fillStyle=a.borderLeftColor,r.fillRect(o,i,b,e.height))}function Pt(r,a={}){try{return jt(r,a)}catch(e){return console.error("Asciify initialization failed:",e),null}}function jt(r,a){let e={...It,...a},{source:c,content:o,output:i}=r,t=i.getContext("webgl2",{alpha:!0,depth:!1,stencil:!1,antialias:!1,premultipliedAlpha:!0});if(!t||t.isContextLost())return null;let v=c.getContext("2d"),M=c,b=!!(v&&typeof v.drawElementImage=="function"&&typeof M.requestPaint=="function"),C=!1,R=!1,x=()=>{},s=null,m=0,g=0,p=0,y=0,f=0,T=!1,U=!1;b&&(M.onpaint=()=>{try{v.reset(),v.drawElementImage(o,0,0),R=!0,H(),x()}catch{}});function L(n=!1){if(b||C)return;let l=n?0:At,u=performance.now()+l;m&&g<=u||(window.clearTimeout(m),g=u,m=window.setTimeout(A,l))}function A(){window.clearTimeout(m),window.clearTimeout(p),m=0,p=0;try{if(Gt(o,c),C)return;s=c,y=o.scrollLeft,f=o.scrollTop,R=!0,T=!1,H(),x()}catch(n){!C&&!T&&(T=!0,console.warn("Asciify could not capture its HTML fallback:",n))}}function F(n,l){let u=t.createShader(n);if(t.shaderSource(u,l),t.compileShader(u),!t.getShaderParameter(u,t.COMPILE_STATUS)){let w=t.getShaderInfoLog(u)||"Unknown shader error";throw t.deleteShader(u),new Error(w)}return u}let Y=F(t.VERTEX_SHADER,Ot),X=F(t.FRAGMENT_SHADER,Nt),S=t.createProgram();if(t.attachShader(S,Y),t.attachShader(S,X),t.linkProgram(S),!t.getProgramParameter(S,t.LINK_STATUS)){let n=t.getProgramInfoLog(S)||"Unknown program link error";throw t.deleteProgram(S),t.deleteShader(Y),t.deleteShader(X),new Error(n)}let d={},et=t.getProgramParameter(S,t.ACTIVE_UNIFORMS);for(let n=0;n<et;n++){let l=t.getActiveUniform(S,n);d[l.name]=t.getUniformLocation(S,l.name)}let dt=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,dt),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);let z=t.createTexture();t.bindTexture(t.TEXTURE_2D,z),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));let ht=1,$=t.createTexture();t.bindTexture(t.TEXTURE_2D,$),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));let _=.25,G=document.createElement("canvas"),q=G.getContext("2d"),nt=!1,K=0,gt=0;function Dt(){if(!q)return;let n=i.getBoundingClientRect(),l=Math.max(1,Math.round(n.width*_)),u=Math.max(1,Math.round(n.height*_));(G.width!==l||G.height!==u)&&(G.width=l,G.height=u),q.clearRect(0,0,l,u),q.fillStyle="#fff";let w=document.createTreeWalker(o,NodeFilter.SHOW_TEXT),k=document.createRange(),D;for(;D=w.nextNode();){if(!D.textContent?.trim())continue;let N=D.parentElement;if(!N||N.checkVisibility&&!N.checkVisibility())continue;k.selectNodeContents(D);let B=k.getClientRects();for(let ft=0;ft<B.length;ft++){let O=B[ft];O.width<1||O.height<1||O.bottom<n.top||O.top>n.bottom||q.fillRect((O.left-n.left-1)*_,(O.top-n.top-1)*_,(O.width+2)*_,(O.height+2)*_)}}let I=o.querySelectorAll("input, textarea, select");for(let N=0;N<I.length;N++){let B=I[N].getBoundingClientRect();B.width<1||B.height<1||B.bottom<n.top||B.top>n.bottom||q.fillRect((B.left-n.left)*_,(B.top-n.top)*_,B.width*_,B.height*_)}nt=!0}function H(){if(K)return;let n=Math.max(0,120-(performance.now()-gt));K=window.setTimeout(()=>{K=0,gt=performance.now(),Dt(),P()},n)}function ot(){let n=!1,l=Math.min(window.devicePixelRatio||1,2),u=Math.max(1,Math.round(i.clientWidth*l)),w=Math.max(1,Math.round(i.clientHeight*l));if((i.width!==u||i.height!==w)&&(i.width=u,i.height=w,n=!0),ht=Math.min(1,Math.max(.05,o.clientWidth/Math.max(i.clientWidth,1))),b){let k=Math.max(1,Math.round(c.clientWidth)),D=Math.max(1,Math.round(c.clientHeight));(c.width!==k*l||c.height!==D*l)&&(c.width=k*l,c.height=D*l,n=!0),M.requestPaint()}return n}ot();let W=[1,1,1],pt=1,it=document.createElement("canvas");it.width=it.height=1;let V=it.getContext("2d",{willReadFrequently:!0});function j(){if(W=[1,1,1],V){let n=o;for(;n;){let l=getComputedStyle(n).backgroundColor;if(l&&l!=="transparent"){V.clearRect(0,0,1,1),V.fillStyle=l,V.fillRect(0,0,1,1);let[u,w,k,D]=V.getImageData(0,0,1,1).data;if(D>0){W=[u/255,w/255,k/255];break}}n=n.parentElement}}pt=.299*W[0]+.587*W[1]+.114*W[2]}j();let h={x:.5,y:.5,tx:.5,ty:.5,active:0,target:0},rt=new Uint32Array(mt);function Ut(){let n=e.glyphs.length>1?e.glyphs:Lt[e.charset]??Lt.ascii,l=Math.min(n.length,mt);rt.fill(0);for(let u=0;u<l;u++)rt[u]=n[u]>>>0;return l}function Bt(){let n=b?c:s;if(!(!n||!R)){R=!1;try{t.bindTexture(t.TEXTURE_2D,z),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,n),t.generateMipmap(t.TEXTURE_2D),U=!1}catch(l){U||(U=!0,console.warn("Asciify could not upload its content texture:",l))}}}function _t(){nt&&(nt=!1,t.bindTexture(t.TEXTURE_2D,$),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,G))}function Ft(){Bt(),_t(),t.useProgram(S),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,z),t.uniform1i(d.uContent,0),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,$),t.uniform1i(d.uTextMask,1),t.uniform2f(d.uContentOffset,b?0:(o.scrollLeft-y)/Math.max(o.clientWidth,1),b?0:(o.scrollTop-f)/Math.max(o.clientHeight,1)),t.uniform2f(d.uResolution,i.width,i.height);let n=i.width/Math.max(i.clientWidth,1),l=Math.max(e.scale,.5),u=Math.max(1.25,l*.75),w=b?n:c.width/Math.max(o.clientWidth,1);t.uniform1f(d.uDotPx,u*n),t.uniform1f(d.uDotLod,Math.max(0,Math.log2(u*Math.max(w,.25)/n)-1)),t.uniform1f(d.uGlowAmt,e.glow),t.uniform1f(d.uAberration,e.aberration);let k=Math.round(Math.min(Math.max(e.spacing,0),3));t.uniform1f(d.uGlyphPx,l*n),t.uniform1f(d.uSpacing,k),t.uniform1f(d.uLod,Math.max(0,Math.log2((5+2*k)*l)-1));let D=Ut();t.uniform1uiv(d["uGlyphs[0]"],rt),t.uniform1i(d.uGlyphCount,D),t.uniform1f(d.uRadius,Math.max(e.radius,.01)),t.uniform1f(d.uSoftness,e.softness),t.uniform2f(d.uPointer,h.x,h.y),t.uniform1f(d.uActive,h.active);let I=e.background==="auto"?W:e.background;t.uniform3f(d.uBg,I[0],I[1],I[2]),t.uniform1f(d.uBackingLum,pt),t.uniform1f(d.uBgOpacity,e.backgroundOpacity),t.uniform1f(d.uContrast,Math.max(e.contrast,0)),t.uniform1f(d.uBrightness,e.brightness),t.uniform1f(d.uInvert,e.invert),t.uniform1f(d.uStrength,e.strength),t.uniform1f(d.uBase,e.baseStrength),t.uniform1f(d.uMaxX,ht),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,i.width,i.height),t.drawArrays(t.TRIANGLE_STRIP,0,4)}let at=0,lt=performance.now(),Q=!1,J=!0,Z=window.matchMedia("(prefers-reduced-motion: reduce)"),vt=Z.matches;function bt(n){if(C)return;if(!J){Q=!1;return}let l=Math.min((n-lt)/1e3,1/30);lt=n;let u=vt?1:1-Math.exp(-l*Math.max(e.followSpeed,.5));h.x+=(h.tx-h.x)*u,h.y+=(h.ty-h.y)*u,h.active+=(h.target-h.active)*u;let w=Math.abs(h.tx-h.x)<5e-4&&Math.abs(h.ty-h.y)<5e-4&&Math.abs(h.target-h.active)<.001;if(w&&(h.x=h.tx,h.y=h.ty,h.active=h.target),Ft(),w&&!R){Q=!1;return}at=requestAnimationFrame(bt)}function P(){C||Q||!J||(Q=!0,lt=performance.now(),at=requestAnimationFrame(bt))}x=P,L(!0),P();function xt(){vt=Z.matches,P()}Z.addEventListener("change",xt);let ct=0;function st(){j(),P(),window.clearTimeout(ct),ct=window.setTimeout(()=>{j(),L(),P()},300)}let Et=new MutationObserver(st);Et.observe(document.documentElement,{attributes:!0,attributeFilter:["class","style","data-theme"]});let Tt=window.matchMedia("(prefers-color-scheme: dark)");Tt.addEventListener("change",st);let ut=new ResizeObserver(()=>{ot()&&L(),P()});ut.observe(i),ut.observe(o);let yt=new IntersectionObserver(n=>{J=n[n.length-1]?.isIntersecting??!0,J&&P()});yt.observe(i);let tt=i.parentElement??i,wt=b?null:new MutationObserver(()=>L());wt?.observe(o,{attributes:!0,attributeFilter:["class","hidden","src","srcset","style"],characterData:!0,childList:!0,subtree:!0});function Mt(){b||C||(window.clearTimeout(p),p=window.setTimeout(A,At),P())}function E(){L()}b||(o.addEventListener("scroll",Mt,{capture:!0,passive:!0}),o.addEventListener("load",E,!0),o.addEventListener("loadeddata",E,!0),o.addEventListener("focusin",E,!0),o.addEventListener("focusout",E,!0),o.addEventListener("input",E,!0),o.addEventListener("change",E,!0),o.addEventListener("transitionend",E,!0),o.addEventListener("transitioncancel",E,!0),o.addEventListener("animationend",E,!0),document.fonts?.addEventListener("loadingdone",E));function Ct(n){let l=i.getBoundingClientRect();h.tx=(n.clientX-l.left)/Math.max(l.width,1),h.ty=1-(n.clientY-l.top)/Math.max(l.height,1),h.target=1,L(),P()}function Rt(){h.target=0,L(),P()}return tt.addEventListener("pointermove",Ct),tt.addEventListener("pointerleave",Rt),o.addEventListener("scroll",H,{capture:!0,passive:!0}),{setOptions(n){let l=!1;for(let[u,w]of Object.entries(n)){let k=e[u];if(Array.isArray(w)&&Array.isArray(k)){if(w.length!==k.length||w.some((D,I)=>D!==k[I])){l=!0;break}}else if(k!==w){l=!0;break}}if(!l){Object.assign(e,n);return}Object.assign(e,n),j(),H(),P()},resize(){ot(),j(),L(),H(),P()},destroy(){C=!0,cancelAnimationFrame(at),window.clearTimeout(ct),window.clearTimeout(m),window.clearTimeout(p),window.clearTimeout(K),ut.disconnect(),yt.disconnect(),Et.disconnect(),wt?.disconnect(),Tt.removeEventListener("change",st),Z.removeEventListener("change",xt),tt.removeEventListener("pointermove",Ct),tt.removeEventListener("pointerleave",Rt),o.removeEventListener("scroll",Mt,!0),o.removeEventListener("scroll",H,{capture:!0}),o.removeEventListener("load",E,!0),o.removeEventListener("loadeddata",E,!0),o.removeEventListener("focusin",E,!0),o.removeEventListener("focusout",E,!0),o.removeEventListener("input",E,!0),o.removeEventListener("change",E,!0),o.removeEventListener("transitionend",E,!0),o.removeEventListener("transitioncancel",E,!0),o.removeEventListener("animationend",E,!0),document.fonts?.removeEventListener("loadingdone",E),t.deleteTexture(z),t.deleteTexture($),t.deleteProgram(S),t.deleteShader(Y),t.deleteShader(X),t.deleteBuffer(dt),b&&(M.onpaint=null)}}}window.Asciify={createAsciify:Pt,supportsHtmlInCanvas:kt};})();
