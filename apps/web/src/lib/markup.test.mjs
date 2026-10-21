import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markupToHtml, driveToLh3, plainText } from './markup.js';

test('penanda ringkas', () => {
  assert.equal(markupToHtml('**tebal** dan *miring* H~2~O x^2^ ==penting=='),
    '<strong>tebal</strong> dan <em>miring</em> H<sub>2</sub>O x<sup>2</sup> <mark>penting</mark>');
});

test('teks biasa di-escape, Enter jadi <br>', () => {
  assert.equal(markupToHtml('a < b\nc'), 'a &lt; b<br>c');
});

test('tautan drive jadi gambar lh3', () => {
  const html = markupToHtml('Lihat https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view.');
  assert.match(html, /<img src="https:\/\/lh3\.googleusercontent\.com\/d\/1AbCdEfGhIjKlMnOp"/);
  assert.match(html, /\.$/);
});

test('HTML lama dipertahankan, tabel tidak pecah', () => {
  const html = markupToHtml('<table>\n<tr><td>1</td></tr>\n</table>');
  assert.ok(!html.includes('<br>'));
});

test('bintang di tengah angka tidak jadi miring', () => {
  assert.equal(markupToHtml('2*3*4'), '2*3*4');
});

test('driveToLh3 dan plainText', () => {
  assert.equal(driveToLh3('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp'), 'https://lh3.googleusercontent.com/d/1AbCdEfGhIjKlMnOp');
  assert.equal(plainText([{ type: 'paragraph', text: 'a' }, { type: 'list', items: ['b', 'c'] }]), 'a b c');
});
