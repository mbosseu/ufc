"""Le générateur réel doit conserver l'ordre de deux articles du même jour."""
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


class PublicationTimeTest(unittest.TestCase):
    def test_real_generator_orders_same_day_articles_by_publication_time(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'tools').mkdir();(root/'data/wp').mkdir(parents=True);(root/'data/articles').mkdir()
            shutil.copy2(Path(__file__).with_name('build.mjs'),root/'tools/build.mjs')
            for name in ('posts.json','pages.json','categories.json'):(root/'data/wp'/name).write_text('[]',encoding='utf-8')
            article={'slug':'ancien','titre':'Ancien article','chapo':'Chapo','corps':'<p>Article.</p>','date':'2026-10-16','categorie':'evenements'}
            (root/'data/articles/a.json').write_text(json.dumps(article),encoding='utf-8')
            article.update(slug='nouveau',titre='Nouvel article',published_at='2026-10-16T15:30:00+02:00')
            (root/'data/articles/z.json').write_text(json.dumps(article),encoding='utf-8')
            (root/'check.mjs').write_text('''import {posts} from './tools/build.mjs';
import assert from 'node:assert/strict';
const ordered=[...posts].sort((a,b)=>new Date(b.date)-new Date(a.date));
assert.equal(ordered[0].slug,'nouveau');
assert.equal(ordered[0].date_gmt,'2026-10-16T13:30:00.000');
''',encoding='utf-8')
            result=subprocess.run(['node',str(root/'check.mjs')],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)


if __name__=='__main__':unittest.main()
