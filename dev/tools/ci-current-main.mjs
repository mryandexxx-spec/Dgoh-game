// Publication may advance over documentation commits, never over changed inputs.
import fs from 'node:fs';
import { git, inputsAt } from './ci-inputs.mjs';
const manifest=JSON.parse(fs.readFileSync('dev/dist/ci-manifest.json','utf8'));
git(['fetch','--no-tags','--depth=1','origin','main']);
const head=git(['rev-parse','origin/main']).trim();
if(inputsAt(head).fingerprint!==manifest.provenance?.fingerprint)throw Error('Release superseded: main contains different build/test inputs');
git(['checkout','--detach',head]);
console.log('Publishing verified inputs onto current main:',head);
