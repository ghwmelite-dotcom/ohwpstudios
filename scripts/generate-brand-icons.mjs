import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Package the approved vector mark for browser, Apple and installed-app fallbacks.
const source=await readFile(new URL('../public/brand/hodges-co-studios-mark.svg',import.meta.url));
const publicDir=new URL('../public/',import.meta.url);
await mkdir(new URL('icons/',publicDir),{recursive:true});
await writeFile(new URL('favicon.svg',publicDir),source);
for(const size of [72,96,128,144,152,192,384,512]){
  await writeFile(new URL(`icons/icon-${size}x${size}.svg`,publicDir),source);
  await sharp(source).resize(size,size).png().toFile(fileURLToPath(new URL(`icons/icon-${size}x${size}.png`,publicDir)));
}
const apple=await sharp(source).resize(180,180).png().toBuffer();
await writeFile(new URL('brand/apple-touch-icon.png',publicDir),apple);
await writeFile(new URL('apple-touch-icon.png',publicDir),apple);
const images=await Promise.all([16,32].map(async size=>({size,data:await sharp(source).resize(size,size).png().toBuffer()})));
const directory=Buffer.alloc(6+16*images.length);
directory.writeUInt16LE(1,2);
directory.writeUInt16LE(images.length,4);
let offset=directory.length;
for(const [index,{size,data}] of images.entries()){
  const start=6+index*16;
  directory[start]=size;directory[start+1]=size;
  directory.writeUInt16LE(1,start+4);directory.writeUInt16LE(32,start+6);
  directory.writeUInt32LE(data.length,start+8);directory.writeUInt32LE(offset,start+12);
  offset+=data.length;
}
await writeFile(new URL('favicon.ico',publicDir),Buffer.concat([directory,...images.map(image=>image.data)]));
console.log('Generated H/C browser, touch and app icons from the approved vector mark.');
