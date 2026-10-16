"""Tests des protections éditoriales, sans appel API et sans publication."""
import copy
import importlib.util
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('editorial_bot',Path(__file__).with_name('editorial_bot.py'))
bot=importlib.util.module_from_spec(spec); spec.loader.exec_module(bot)


class EditorialTests(unittest.TestCase):
    def topic(self):
        return dict(slug='test-alpha-beta', angle='preview', organisation='ufc',fighters=['Jean Alpha','Marc Beta'],
            event='UFC Test',event_date='2026-10-17',venue='Paris',news_date='2026-10-16',
            facts=[{'claim':'Un combat','source_url':'https://ufc.com/news/test','quote':'An official test announcement'}],
            sources=[{'url':'https://ufc.com/news/test'}],portraits=[{},{}])

    def article(self):
        return dict(slug='test-alpha-beta',titre='Alpha contre Beta',titre_seo='Alpha contre Beta | UFC.FR',
            chapo='Une présentation du combat.',meta_description='Les informations confirmées.',categorie='evenements',
            corps='<h2>Les enjeux</h2><p>'+('texte original ' * 160)+
            '<a href="/guide/">guide</a> <a href="/evenements/">événements</a></p>')

    def test_failed_evidence_selects_another_topic(self):
        first=self.topic();first['slug']='premier-sujet'
        second=self.topic()
        with tempfile.TemporaryDirectory() as d,patch.object(bot,'ask',side_effect=[first,second]) as ask,patch.object(bot,'resolve_portraits'),patch.object(bot,'evidence',side_effect=[bot.Stop('Date incorrecte'),{'source':'Texte'}]):
            result=bot.choose_topic('Recherche',[],date(2026,10,16),Path(d),verify=True)
            self.assertEqual(result['slug'],second['slug'])
            self.assertIn('Date incorrecte',ask.call_args.args[0])

    def test_correct_source_date_then_recheck(self):
        t=self.topic();t['news_date']='2026-10-17'
        fields=['fighters','event','event_date','venue','news_date','facts']
        replies=[{'ok':False,'problems':['Publication le 16, combat le 17']},
                 {'news_date':'2026-10-16','facts':t['facts'],'times':[]},
                 {'ok':True,'verified_fields':fields}]
        with tempfile.TemporaryDirectory() as d,patch.object(bot,'get_url',return_value='An official test announcement '*30),patch.object(bot,'ask',side_effect=replies):
            bot.evidence(t,Path(d))
            self.assertEqual(t['news_date'],'2026-10-16')
            self.assertEqual(t['event_date'],'2026-10-17')
            bot.validate_topic(t,[],date(2026,10,16))

    def test_three_failed_sources_stop_without_publication(self):
        with tempfile.TemporaryDirectory() as d,patch.object(bot,'ask',side_effect=[self.topic() for _ in range(3)]) as ask,patch.object(bot,'resolve_portraits'),patch.object(bot,'evidence',side_effect=bot.Stop('Source non concluante')) as check:
            self.assertIsNone(bot.choose_topic('Recherche',[],date(2026,10,16),Path(d),verify=True))
            self.assertEqual(check.call_count,3)

    def test_duplicate_match(self):
        with self.assertRaises(bot.Stop):
            bot.validate_topic(self.topic(),[{'slug':'alpha-beta-presentation','titre':'Alpha face à Beta'}],date(2026,10,16))

    def test_result_is_new_angle(self):
        t=self.topic();t.update(angle='results',event_date='2026-10-15')
        bot.validate_topic(t,[{'slug':'alpha-beta-presentation','titre':'Alpha face à Beta'}],date(2026,10,16))
        with self.assertRaises(bot.Stop):
            bot.validate_topic(t,[{'slug':'alpha-beta-resultats','titre':'Résultats Alpha Beta'}],date(2026,10,16))

    def test_future_results_and_stale_news(self):
        for changes in ({'angle':'results'},{'news_date':'2026-09-01'}):
            t=self.topic();t.update(changes)
            with self.assertRaises(bot.Stop): bot.validate_topic(t,[],date(2026,10,16))

    def test_article_with_internal_links(self):
        bot.validate_article(self.article(),self.topic(),{'/guide/','/evenements/'})

    def test_external_and_hidden_links(self):
        for url in ('https://example.com','//example.com','javascript:alert(1)','&#104;ttps://example.com','/missing/'):
            a=self.article();a['corps']=a['corps'].replace('/guide/',url)
            with self.assertRaises(bot.Stop): bot.validate_article(a,self.topic(),{'/guide/','/evenements/'})

    def test_script_and_attribute_rejected(self):
        for fragment in ('<script>alert(1)</script>','<p onclick="alert(1)">texte</p>'):
            a=self.article();a['corps']+=fragment
            with self.assertRaises(bot.Stop): bot.validate_article(a,self.topic(),{'/guide/','/evenements/'})

    def test_timezone_dst_conversion(self):
        t={'times':[{'label':'Main','iso':'2026-10-17T20:00:00-04:00'}]}
        self.assertEqual(bot.france_times(t)[0]['france'],'2026-10-18T02:00:00+02:00')
        t['times'][0]['iso']='2026-11-14T20:00:00-05:00'
        self.assertEqual(bot.france_times(t)[0]['france'],'2026-11-15T02:00:00+01:00')
        t['times'][0]['iso']='2026-10-17T20:00:00'
        with self.assertRaises(bot.Stop):bot.france_times(t)

    def test_quote_must_exist_before_ai(self):
        with tempfile.TemporaryDirectory() as d,patch.object(bot,'get_url',return_value='Document officiel sans cet extrait. '*30),patch.object(bot,'ask',return_value={'facts':self.topic()['facts'],'times':[]}) as ask:
            with self.assertRaises(bot.Stop):bot.evidence(self.topic(),Path(d))
            self.assertEqual(ask.call_count,1)

    def test_public_portraits_not_blocked_by_unknown_license(self):
        t=self.topic();t['portraits']=[{'fighter':f,'license':'UNKNOWN','source_page_url':'https://ufc.com/athlete/test','image_url':'https://ufc.com/test.png'} for f in t['fighters']]
        def fetch(url,**kwargs):return b'\x89PNG test' if url.endswith('.png') else b'<p>Jean Alpha Marc Beta</p><img src="https://ufc.com/test.png">'
        with tempfile.TemporaryDirectory() as d,patch.object(bot,'get_url',side_effect=fetch),patch.object(bot,'ask',return_value={'ok':True}):
            paths=bot.portraits(t,Path(d))
            self.assertEqual(len(paths),2)
            import json
            notes=json.loads((Path(d)/'portrait-source-0.json').read_text(encoding='utf-8'))
            self.assertEqual(notes['rights_status'],'not_established')

    def test_portrait_source_page_required(self):
        t=self.topic();t['portraits']=[{'fighter':'Jean Alpha','license':'UNKNOWN','image_url':'https://ufc.com/test.png'}]
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(bot.Stop):bot.portraits(t,Path(d))

    def test_dirty_worktree_cannot_publish(self):
        with patch.object(bot,'command',return_value=' M unrelated.txt\n'):
            with self.assertRaises(bot.Stop):bot.ensure_clean()

    def test_private_network_and_unofficial_sources_rejected(self):
        for url in ('http://ufc.com/news','https://127.0.0.1/test','https://example.com/test'):
            with self.assertRaises(bot.Stop):bot.get_url(url,official=True)

    def test_missing_portraits_try_another_topic(self):
        first=self.topic();first['slug']='premier-sujet';first['organisation']='pfl'
        second=self.topic()
        with tempfile.TemporaryDirectory() as d,patch.object(bot,'ask',side_effect=[first,second]) as ask,patch.object(bot,'resolve_portraits',side_effect=[bot.Stop('Portrait absent'),None]):
            topic=bot.choose_topic('Recherche',[],date(2026,10,16),Path(d))
            self.assertEqual(topic['slug'],second['slug']);self.assertEqual(ask.call_count,2)

    def test_no_topic_does_not_loop_forever(self):
        with tempfile.TemporaryDirectory() as d,patch.object(bot,'ask',return_value={'skip_reason':'Aucun sujet'}) as ask:
            self.assertIsNone(bot.choose_topic('Recherche',[],date(2026,10,16),Path(d)))
            self.assertEqual(ask.call_count,3)

    def test_drafting_facts_reject_unverifiable_quotes(self):
        with tempfile.TemporaryDirectory() as d,patch.object(bot,'ask',return_value={'facts':[{'claim':'Fait inventé','source_url':'https://ufc.com/news/test','quote':'citation absente du texte'}]*8}):
            with self.assertRaises(bot.Stop):bot.drafting_facts(self.topic(),{'https://ufc.com/news/test':'Document réel'},Path(d))

    def test_drafting_facts_keep_only_real_source_excerpts(self):
        fact={'claim':'Fait utile','source_url':'https://ufc.com/news/test','quote':'Une phrase réellement présente dans la source.'}
        with tempfile.TemporaryDirectory() as d,patch.object(bot,'ask',return_value={'facts':[dict(fact) for _ in range(3)]+[{'claim':'Inventé','source_url':'https://ufc.com/news/test','quote':'Une citation qui n’existe pas dans le document'}]}):
            result=bot.drafting_facts(self.topic(),{'https://ufc.com/news/test':fact['quote']},Path(d))
            self.assertEqual(len(result),3)

    def test_live_title_allows_french_typography_and_entities(self):
        self.assertTrue(bot.title_matches('<h1>UFC Edmonton\u00a0: l&#39;affiche &amp; les enjeux</h1>',"UFC Edmonton : l'affiche & les enjeux"))
        self.assertFalse(bot.title_matches('<h1>Ancien article</h1>','Nouvel article'))

    def test_reviewer_must_quote_real_article_and_source(self):
        article={'corps':'<p>Le combat est prévu à Paris.</p>'};docs={'https://ufc.com/news/test':'Le combat est prévu à Edmonton au Canada.'}
        issue={'type':'contradiction','article_quote':'Le combat est prévu à Paris.','source_url':'https://ufc.com/news/test','source_quote':docs['https://ufc.com/news/test']}
        self.assertTrue(bot.grounded_review({'ok':False,'issues':[issue]},article,docs))
        issue['article_quote']='Un passage absent de cet article.'
        self.assertFalse(bot.grounded_review({'ok':False,'issues':[issue]},article,docs))

    def test_missing_detail_is_not_a_factual_error(self):
        self.assertFalse(bot.grounded_review({'ok':False,'issues':[{'type':'omission'}]},self.article(),{}))
        self.assertFalse(bot.grounded_review({'ok':False,'problems':['Il faut plus de détails.']},self.article(),{}))


if __name__=='__main__':unittest.main()
