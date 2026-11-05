// Read original PNG outlines and produce CSS clip geometry. Source images stay intact.
const fs = require('node:fs');
const zlib = require('node:zlib');
function pixels(file) {
  const png = fs.readFileSync(file); let pos=8, width,height,type,depth,parts=[];
  while(pos<png.length){const n=png.readUInt32BE(pos), kind=png.toString('ascii',pos+4,pos+8), bytes=png.subarray(pos+8,pos+8+n);if(kind==='IHDR'){width=bytes.readUInt32BE(0);height=bytes.readUInt32BE(4);depth=bytes[8];type=bytes[9];}if(kind==='IDAT')parts.push(bytes);pos+=n+12;}
  if(depth!==8 || ![2,6].includes(type))throw Error('Unsupported PNG '+file);
  const channels=type===6?4:3, stride=width*channels, raw=zlib.inflateSync(Buffer.concat(parts)), data=Buffer.alloc(height*stride);let offset=0;
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){const filter=raw[offset++];for(let x=0;x<stride;x++){const a=x>=channels?data[y*stride+x-channels]:0,b=y?data[(y-1)*stride+x]:0,c=y&&x>=channels?data[(y-1)*stride+x-channels]:0;let v=raw[offset++];if(filter===1)v+=a;if(filter===2)v+=b;if(filter===3)v+=Math.floor((a+b)/2);if(filter===4)v+=paeth(a,b,c);data[y*stride+x]=v&255;}}
  return {width,height,channels,data};
}
const ids=fs.readdirSync('assets/maps').filter(f=>f.endsWith('-badge.png')).map(f=>f.replace('-badge.png',''));
let defs='';
for(const id of ids){
  const {width:w,height:h,channels:c,data}=pixels(`assets/maps/${id}-badge.png`), outside=new Uint8Array(w*h), queue=new Int32Array(w*h);let head=0,tail=0;
  function background(i){const p=i*c,r=data[p],g=data[p+1],b=data[p+2];return (c===4&&data[p+3]<12)||Math.max(r,g,b)<18||(id==='split'&&Math.min(r,g,b)>185&&Math.max(r,g,b)-Math.min(r,g,b)<14);}
  function add(i){if(!outside[i]&&background(i)){outside[i]=1;queue[tail++]=i;}}
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
  while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);if(x>0)add(i-1);if(x<w-1)add(i+1);if(y>0)add(i-w);if(y<h-1)add(i+w);}
  let path='';
  for(let y=0;y<h;y++){let x=0;while(x<w){while(x<w&&outside[y*w+x])x++;let start=x;while(x<w&&!outside[y*w+x])x++;if(x>start)path+=`M${start} ${y}h${x-start}v1H${start}z`;}}
  defs+=`<clipPath id="badge-${id}" clipPathUnits="objectBoundingBox"><path transform="scale(${1/w} ${1/h})" d="${path}"/></clipPath>`;
  console.log(id+': outline ready');
}
let html=fs.readFileSync('maps.html','utf8').replace(/<!-- badge-clips:start -->[\s\S]*?<!-- badge-clips:end -->\s*/,'');
html=html.replace('<body class="maps-page">',`<body class="maps-page">\n<!-- badge-clips:start --><svg width="0" height="0" aria-hidden="true" style="position:absolute;pointer-events:none"><defs>${defs}</defs></svg><!-- badge-clips:end -->`);
fs.writeFileSync('maps.html',html);
