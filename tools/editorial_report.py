"""Rapport public minimal ; les sources, prompts et réponses API restent privés."""
import json
import os
import urllib.request
from pathlib import Path

TITLE='Bot éditorial UFC.fr : intervention nécessaire'
MARKER='<!-- ufc-editorial-monitor -->'


def report(root):
    runs=sorted(p for p in (root/'.research/editorial-bot').glob('*') if p.is_dir())
    state={}; publication={}
    if runs:
        run=runs[-1]
        for name,dest in [('state.json',state),('publication.json',publication)]:
            if (run/name).exists():dest.update(json.loads((run/name).read_text(encoding='utf-8')))
    result={'job':os.environ.get('JOB_STATUS','unknown'),'mode':os.environ.get('BOT_MODE','check'),
            'state':publication.get('state',state.get('state','configuration_checked')),
            'stage':state.get('stage','configuration'),'commit':publication.get('commit')}
    url=publication.get('url')
    if url and url.startswith('https://ufc.fr/'):result['article']=url
    return result


def api(path,data=None,method=None):
    request=urllib.request.Request('https://api.github.com'+path,
        data=None if data is None else json.dumps(data).encode(),method=method,
        headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json',
                 'User-Agent':'ufc-editorial-monitor','X-GitHub-Api-Version':'2022-11-28'})
    with urllib.request.urlopen(request,timeout=30) as response:
        return json.load(response)


def notify(result,run_url):
    repo=os.environ['GITHUB_REPOSITORY']
    issues=api('/repos/'+repo+'/issues?state=open&per_page=100')
    existing=next((i for i in issues if i.get('title')==TITLE and MARKER in (i.get('body') or '')),None)
    if result['job'] in ('failure','cancelled'):
        body=(MARKER+'\nLe bot n’a pas terminé son passage.\n\n'
              'Étape : `'+result['stage']+'`. État : `'+result['state']+'`.\n\n'
              '[Consulter le rapport et les journaux]('+run_url+').\n\n'
              'Vérifier si un commit a déjà été poussé avant de relancer, afin de ne pas doubler une publication.')
        if existing:api('/repos/'+repo+'/issues/'+str(existing['number']),{'body':body},'PATCH')
        else:api('/repos/'+repo+'/issues',{'title':TITLE,'body':body,'assignees':[repo.split('/')[0]]},'POST')
    elif result['job']=='success' and existing:
        # Un simple test de configuration ne prouve pas le rétablissement de la publication.
        if result['state'] in ('live','no_eligible_topic'):
            api('/repos/'+repo+'/issues/'+str(existing['number'])+'/comments',{'body':'Fonctionnement rétabli. [Passage vérifié]('+run_url+').'},'POST')
            api('/repos/'+repo+'/issues/'+str(existing['number']),{'state':'closed'},'PATCH')


if __name__=='__main__':
    result=report(Path(__file__).resolve().parents[1])
    run_url='https://github.com/'+os.environ['GITHUB_REPOSITORY']+'/actions/runs/'+os.environ['GITHUB_RUN_ID']
    text='## Bot éditorial UFC.fr\n\n'+'\n'.join('- **'+k+'** : '+str(v) for k,v in result.items() if v is not None)+'\n'
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf-8') as output:output.write(text)
    print(text)
    notify(result,run_url)
