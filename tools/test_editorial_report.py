import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('report',Path(__file__).with_name('editorial_report.py'))
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)


class ReportTests(unittest.TestCase):
    def test_private_notes_and_secret_are_not_in_report(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);run=root/'.research/editorial-bot/20261016';run.mkdir(parents=True)
            (run/'state.json').write_text(json.dumps({'state':'failed','stage':'facts','reason':'private source text and secret'}))
            result=mod.report(root)
            self.assertEqual(result['stage'],'facts')
            self.assertNotIn('private source',json.dumps(result));self.assertNotIn('reason',result)

    def test_failure_creates_assigned_issue(self):
        with patch.dict(os.environ,{'GITHUB_REPOSITORY':'owner/repo'}),patch.object(mod,'api',side_effect=[[],{}]) as api:
            mod.notify({'job':'failure','stage':'poster','state':'failed'},'https://github.com/owner/repo/actions/runs/1')
            args=api.call_args_list[1].args
            self.assertEqual(args[1]['assignees'],['owner']);self.assertEqual(args[2],'POST')

    def test_existing_failure_does_not_create_duplicate_issue(self):
        old={'number':7,'title':mod.TITLE,'body':mod.MARKER}
        with patch.dict(os.environ,{'GITHUB_REPOSITORY':'owner/repo'}),patch.object(mod,'api',side_effect=[[old],{}]) as api:
            mod.notify({'job':'failure','stage':'poster','state':'failed'},'https://github.com/owner/repo/actions/runs/2')
            self.assertEqual(api.call_args_list[1].args[0],'/repos/owner/repo/issues/7')
            self.assertEqual(api.call_args_list[1].args[2],'PATCH')

    def test_doctor_success_cannot_close_publication_failure(self):
        old={'number':7,'title':mod.TITLE,'body':mod.MARKER}
        with patch.dict(os.environ,{'GITHUB_REPOSITORY':'owner/repo'}),patch.object(mod,'api',return_value=[old]) as api:
            mod.notify({'job':'success','state':'configuration_checked'},'https://github.com/owner/repo/actions/runs/3')
            self.assertEqual(api.call_count,1)

    def test_real_recovery_closes_issue(self):
        old={'number':7,'title':mod.TITLE,'body':mod.MARKER}
        with patch.dict(os.environ,{'GITHUB_REPOSITORY':'owner/repo'}),patch.object(mod,'api',side_effect=[[old],{},{}]) as api:
            mod.notify({'job':'success','state':'live'},'https://github.com/owner/repo/actions/runs/4')
            self.assertEqual(api.call_args_list[-1].args[1],{'state':'closed'})

    def test_no_new_topic_does_not_prove_failed_publication_is_fixed(self):
        old={'number':7,'title':mod.TITLE,'body':mod.MARKER}
        with patch.dict(os.environ,{'GITHUB_REPOSITORY':'owner/repo'}),patch.object(mod,'api',return_value=[old]) as api:
            mod.notify({'job':'success','state':'no_eligible_topic'},'https://github.com/owner/repo/actions/runs/5')
            self.assertEqual(api.call_count,1)


if __name__=='__main__':unittest.main()
