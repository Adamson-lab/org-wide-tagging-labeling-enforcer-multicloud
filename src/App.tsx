import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  Layers,
  Play,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Tags,
} from 'lucide-react';
import {
  ENFORCER_DOMAINS,
  TAGGING_ENFORCER_COMPONENTS,
  type EnforcerDomain,
} from './data/taggingEnforcerComponents';

const PROJECT_NAME = 'org-wide-tagging-labeling-enforcer-multicloud';
const DEFAULT_LIVE_URL = `https://${PROJECT_NAME}.onrender.com`;
const DEFAULT_NEW_REPO = 'Adamson-lab/org-wide-tagging-labeling-enforcer-multicloud';

export function App() {
  const [selectedDomain, setSelectedDomain] = useState<'All' | EnforcerDomain>('All');
  const [selectedCloud, setSelectedCloud] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [ownerTag, setOwnerTag] = useState('platform-governance');
  const [costCenterTag, setCostCenterTag] = useState('CC-5010');
  const [envTag, setEnvTag] = useState('prod');
  const [dataClassTag, setDataClassTag] = useState('confidential');
  const [ttlTag, setTtlTag] = useState('30d');
  const [liveUrlInput, setLiveUrlInput] = useState(DEFAULT_LIVE_URL);
  const [copiedPolicyJson, setCopiedPolicyJson] = useState(false);

  const [ghRepo, setGhRepo] = useState(DEFAULT_NEW_REPO);
  const [ghWorkflow, setGhWorkflow] = useState('tagging-enforce.yml');
  const [ghRef, setGhRef] = useState('main');
  const [ghToken, setGhToken] = useState('');
  const [dispatchResult, setDispatchResult] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  const normalizedPolicyBundle = useMemo(() => {
    const cleanOwner = ownerTag.trim().toLowerCase();
    const cleanCc = costCenterTag.trim().toUpperCase();
    const cleanEnv = envTag.trim().toLowerCase();
    const cleanClass = dataClassTag.trim().toLowerCase();
    const cleanTtl = ttlTag.trim().toLowerCase();

    return {
      project: PROJECT_NAME,
      live_target_url: liveUrlInput.trim() || DEFAULT_LIVE_URL,
      total_components: TAGGING_ENFORCER_COMPONENTS.length,
      canonical_tags: {
        owner: cleanOwner,
        'cost-center': cleanCc,
        environment: cleanEnv,
        'data-classification': cleanClass,
        ttl: cleanTtl,
      },
      cloud_projections: {
        aws_tags: {
          owner: cleanOwner,
          'cost-center': cleanCc,
          environment: cleanEnv,
          'data-classification': cleanClass,
          ttl: cleanTtl,
        },
        azure_tags: {
          owner: cleanOwner,
          costCenter: cleanCc,
          environment: cleanEnv,
          dataClassification: cleanClass,
          ttl: cleanTtl,
        },
        gcp_labels_and_tags: {
          owner: cleanOwner.replace(/[^a-z0-9_-]/g, '-'),
          cost_center: cleanCc.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
          environment: cleanEnv.replace(/[^a-z0-9_-]/g, '-'),
          data_classification: cleanClass.replace(/[^a-z0-9_-]/g, '-'),
        },
      },
    };
  }, [ownerTag, costCenterTag, envTag, dataClassTag, ttlTag, liveUrlInput]);

  const filteredComponents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return TAGGING_ENFORCER_COMPONENTS.filter((comp) => {
      const domainMatch = selectedDomain === 'All' || comp.domain === selectedDomain;
      const cloudMatch = selectedCloud === 'All' || comp.cloudScope === selectedCloud;
      const textMatch =
        !q ||
        comp.id.toLowerCase().includes(q) ||
        comp.title.toLowerCase().includes(q) ||
        comp.domain.toLowerCase().includes(q) ||
        comp.cloudScope.toLowerCase().includes(q) ||
        comp.enforcementMode.toLowerCase().includes(q);
      return domainMatch && cloudMatch && textMatch;
    });
  }, [selectedDomain, selectedCloud, searchTerm]);

  async function handleCopyBundle() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(normalizedPolicyBundle, null, 2));
      setCopiedPolicyJson(true);
      setTimeout(() => setCopiedPolicyJson(false), 1800);
    } catch {
      setCopiedPolicyJson(false);
    }
  }

  function handleDownloadBundle() {
    const blob = new Blob([JSON.stringify(normalizedPolicyBundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${PROJECT_NAME}-policy-bundle.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDispatch() {
    if (!ghRepo.trim() || !ghWorkflow.trim() || !ghToken.trim()) {
      setDispatchResult('Enter GitHub owner/repo, workflow filename, and a token to dispatch.');
      return;
    }
    setIsDispatching(true);
    setDispatchResult(null);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${ghRepo.trim()}/actions/workflows/${ghWorkflow.trim()}/dispatches`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${ghToken.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: ghRef.trim() || 'main',
            inputs: {
              owner: normalizedPolicyBundle.canonical_tags.owner,
              cost_center: normalizedPolicyBundle.canonical_tags['cost-center'],
              environment: normalizedPolicyBundle.canonical_tags.environment,
              data_classification: normalizedPolicyBundle.canonical_tags['data-classification'],
            },
          }),
        }
      );
      if (res.status === 204) {
        setDispatchResult(
          `Dispatched ${ghWorkflow.trim()} on ${ghRepo.trim()} (${ghRef.trim() || 'main'}).`
        );
      } else {
        const body = await res.text();
        setDispatchResult(`GitHub API ${res.status}: ${body || 'Check repo, workflow, & token.'}`);
      }
    } catch (err) {
      setDispatchResult(
        `Dispatch error: ${err instanceof Error ? err.message : 'Network error'}`
      );
    } finally {
      setIsDispatching(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-sky-400 uppercase">
              {PROJECT_NAME}
            </p>
            <h1 className="text-2xl font-bold text-white">
              Org-Wide Tagging &amp; Labeling Enforcer Across Three Clouds
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-emerald-700/60 bg-emerald-950/60 px-3 py-1.5 text-emerald-300">
              Total Components: {TAGGING_ENFORCER_COMPONENTS.length}
            </span>
            <span className="rounded-md border border-sky-700/60 bg-sky-950/60 px-3 py-1.5 text-sky-300">
              Filtered View: {filteredComponents.length}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Tags className="h-4 w-4 text-sky-400" />
                <span>Canonical Tag &amp; Label Normalizer (AWS · Azure · GCP)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyBundle}
                  className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedPolicyJson ? 'Copied JSON' : 'Copy Bundle'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBundle}
                  className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
                >
                  <Download className="h-3 w-3" />
                  <span>Download JSON</span>
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs text-slate-300">
                Owner Tag
                <input
                  value={ownerTag}
                  onChange={(e) => setOwnerTag(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs text-slate-300">
                Cost Center
                <input
                  value={costCenterTag}
                  onChange={(e) => setCostCenterTag(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs text-slate-300">
                Environment
                <input
                  value={envTag}
                  onChange={(e) => setEnvTag(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs text-slate-300">
                Data Classification
                <input
                  value={dataClassTag}
                  onChange={(e) => setDataClassTag(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs text-slate-300">
                TTL Tag
                <input
                  value={ttlTag}
                  onChange={(e) => setTtlTag(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs text-slate-300">
                Deployment Target URL
                <input
                  value={liveUrlInput}
                  onChange={(e) => setLiveUrlInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </label>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <p className="text-xs font-semibold text-slate-200">
                GitHub Actions Workflow Dispatch (New Repository Target)
              </p>
              <div className="grid gap-2 sm:grid-cols-4">
                <input
                  value={ghRepo}
                  onChange={(e) => setGhRepo(e.target.value)}
                  placeholder="owner/repo"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  value={ghWorkflow}
                  onChange={(e) => setGhWorkflow(e.target.value)}
                  placeholder="workflow.yml"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  value={ghRef}
                  onChange={(e) => setGhRef(e.target.value)}
                  placeholder="main"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="password"
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                  placeholder="GitHub PAT (actions:write)"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isDispatching}
                  onClick={handleDispatch}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{isDispatching ? 'Dispatching...' : 'Dispatch Enforcement Workflow'}</span>
                </button>
                {dispatchResult && <p className="text-xs text-amber-300">{dispatchResult}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldAlert className="h-4 w-4 text-emerald-400" />
              <span>Normalized Multi-Cloud Projection</span>
            </div>
            <pre className="max-h-72 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-emerald-300">
              <code>{JSON.stringify(normalizedPolicyBundle.cloud_projections, null, 2)}</code>
            </pre>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>All 700 components (TM-001 to TM-700) indexed</span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <SlidersHorizontal className="h-4 w-4 text-sky-400" />
              <button
                type="button"
                onClick={() => setSelectedDomain('All')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                  selectedDomain === 'All'
                    ? 'bg-sky-500 text-slate-950'
                    : 'border border-slate-800 bg-slate-900 text-slate-300'
                }`}
              >
                All Domains ({TAGGING_ENFORCER_COMPONENTS.length})
              </button>
              {ENFORCER_DOMAINS.map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => setSelectedDomain(dom)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                    selectedDomain === dom
                      ? 'bg-sky-500 text-slate-950'
                      : 'border border-slate-800 bg-slate-900 text-slate-300'
                  }`}
                >
                  {dom}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['All', 'AWS', 'Azure', 'GCP', 'Multicloud'].map((cloud) => (
                <button
                  key={cloud}
                  type="button"
                  onClick={() => setSelectedCloud(cloud)}
                  className={`rounded-md px-2.5 py-1 text-xs ${
                    selectedCloud === cloud
                      ? 'bg-emerald-400 font-semibold text-slate-950'
                      : 'border border-slate-800 bg-slate-900 text-slate-300'
                  }`}
                >
                  {cloud}
                </button>
              ))}
              <div className="relative w-64">
                <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search TM-001..TM-700..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 py-1.5 pr-3 pl-8 text-xs text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredComponents.map((comp) => (
              <div
                key={comp.id}
                className="rounded-xl border border-slate-800 bg-slate-900/90 p-4"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-mono font-semibold text-sky-400">
                    <Layers className="h-3 w-3" />
                    {comp.id} · {comp.cloudScope}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                    {comp.enforcementMode}
                  </span>
                </div>
                <h2 className="mt-1.5 text-sm font-semibold text-white">{comp.title}</h2>
                <p className="mt-1 text-xs text-slate-400">{comp.summary}</p>
                <p className="mt-2 text-[11px] text-slate-500">{comp.domain}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;