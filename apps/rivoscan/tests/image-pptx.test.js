import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {createImageSlideDeck} from '../src/image-pptx.js';
const JPEG='/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD06iiigD//2Q==';
test('Image-backed slides use valid OOXML PowerPoint structure and one slide per page',async()=>{
 const bytes=Uint8Array.from(Buffer.from(JPEG,'base64'));
 const output=await createImageSlideDeck([{bytes,width:2,height:2},{bytes,width:4,height:2}]);
 const archive=await JSZip.loadAsync(output);
 assert.ok(archive.file('[Content_Types].xml'));
 assert.ok(archive.file('ppt/presentation.xml'));
 assert.ok(archive.file('ppt/slides/slide1.xml'));
 assert.ok(archive.file('ppt/slides/slide2.xml'));
 assert.ok(archive.file('ppt/_rels/presentation.xml.rels'));
 const pictures=Object.keys(archive.files).filter(x=>/^ppt\/media\/[^/]+\.jpg$/i.test(x));
 assert.ok(pictures.length>=2);
 const xml=await archive.file('ppt/slides/slide1.xml').async('string');
 assert.ok(xml.includes('<p:pic>')||xml.includes('<p:pic '));
});
test('PPTX export rejects invalid dimensions and partial images',async()=>{
 const bytes=Uint8Array.from(Buffer.from(JPEG,'base64'));
 await assert.rejects(createImageSlideDeck([]));
 await assert.rejects(createImageSlideDeck([{bytes,width:0,height:10}]));
 await assert.rejects(createImageSlideDeck([{bytes:new Uint8Array([0xff,0xd8,0,0]),width:2,height:2}]));
});
