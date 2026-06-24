import { useState } from 'react';
import { apiSchema } from '../../data/api-schema';
import { Bot, Code2, Database, FileJson, Key, Layout, Server, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ApiDocs = () => {
  const [activeGroup, setActiveGroup] = useState(apiSchema.endpoints[0].group);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'POST': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PUT': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/panel/dashboard" className="text-slate-500 hover:text-slate-800 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Code2 className="w-4 h-4" />
                </div>
                <h1 className="font-bold text-xl text-slate-800 tracking-tight">API Developer Center</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                v{apiSchema.version}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-8">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Introducción</h3>
              <ul className="space-y-1">
                <li>
                  <button onClick={() => setActiveGroup('auth')} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeGroup === 'auth' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                    Autenticación (Agentes)
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recursos REST</h3>
              <ul className="space-y-1">
                {apiSchema.endpoints.map(group => (
                  <li key={group.group}>
                    <button 
                      onClick={() => setActiveGroup(group.group)} 
                      className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeGroup === group.group ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {group.group}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 max-w-3xl">
          
          {/* Header Info */}
          <div className="mb-10 animate-fade-in">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">{apiSchema.title}</h2>
            <p className="text-slate-600 leading-relaxed text-lg">{apiSchema.description}</p>
            <div className="mt-6 flex items-center gap-3 bg-slate-100 px-4 py-3 rounded-xl border border-slate-200">
              <Server className="w-5 h-5 text-slate-500" />
              <code className="text-sm font-mono text-slate-800 font-semibold">{apiSchema.baseUrl}</code>
            </div>
          </div>

          {/* Render Auth Section */}
          {activeGroup === 'auth' && (
            <section className="animate-fade-in space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Key className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Autenticación para Agentes (MCP)</h3>
                </div>
                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                  Esta API está diseñada para ser consumida programáticamente por agentes de inteligencia artificial y otros sistemas automatizados. 
                  El acceso requiere la validación dual de la identidad del agente y su token de acceso seguro.
                </p>
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Headers Requeridos</h4>
                  {apiSchema.authentication.headers.map(header => (
                    <div key={header.name} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <code className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">{header.name}</code>
                      <p className="text-sm text-slate-600">{header.description}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-slate-800 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto">
                  <pre>{`curl -X GET "${apiSchema.baseUrl}/collections" \\
  -H "X-Entity-ID: 123e4567-e89b-12d3-a456-426614174000" \\
  -H "Authorization: Bearer sk_your_generated_token_here"`}</pre>
                </div>
              </div>
            </section>
          )}

          {/* Render Endpoints */}
          {apiSchema.endpoints.map(group => {
            if (group.group !== activeGroup) return null;
            return (
              <section key={group.group} className="animate-fade-in space-y-8">
                <div className="border-b border-slate-200 pb-4 mb-6">
                  <h3 className="text-2xl font-bold text-slate-800">{group.group}</h3>
                  <p className="text-slate-500 mt-2">{group.description}</p>
                </div>

                {group.routes.map((route, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden scroll-mt-24" id={route.path.replace(/\//g, '-')}>
                    {/* Route Header */}
                    <div className="border-b border-slate-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded border uppercase tracking-wide ${getMethodColor(route.method)}`}>
                          {route.method}
                        </span>
                        <code className="text-sm font-mono font-semibold text-slate-700">{route.path}</code>
                      </div>
                    </div>

                    <div className="p-5 space-y-6">
                      <p className="text-sm text-slate-600 leading-relaxed">{route.description}</p>

                      {/* Parameters */}
                      {route.parameters && route.parameters.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Query Parameters</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-500 text-xs">
                                <tr>
                                  <th className="px-4 py-2 font-medium rounded-tl-lg">Nombre</th>
                                  <th className="px-4 py-2 font-medium">Tipo</th>
                                  <th className="px-4 py-2 font-medium">Requerido</th>
                                  <th className="px-4 py-2 font-medium rounded-tr-lg">Descripción</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {route.parameters.map(param => (
                                  <tr key={param.name}>
                                    <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-semibold">{param.name}</td>
                                    <td className="px-4 py-3 text-slate-600 text-xs">
                                      {param.type}
                                      {param.enum && <div className="mt-1 text-[10px] text-slate-400">[{param.enum.join(' | ')}]</div>}
                                    </td>
                                    <td className="px-4 py-3">
                                      {param.required 
                                        ? <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded">Sí</span>
                                        : <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">No</span>
                                      }
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-xs">{param.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Body Schema */}
                      {route.body && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Request Body (JSON)</h4>
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <ul className="space-y-3">
                              {Object.entries(route.body).map(([key, details]: [string, any]) => (
                                <li key={key} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 text-sm">
                                  <div className="w-40 flex-shrink-0 flex items-center gap-2">
                                    <code className="font-mono font-semibold text-slate-700">{key}</code>
                                    {details.required && <span className="text-red-500 text-lg leading-none" title="Requerido">*</span>}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs text-indigo-500 font-medium">{details.type}</span>
                                      {details.enum && <span className="text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">enum</span>}
                                    </div>
                                    <p className="text-xs text-slate-600">{details.description}</p>
                                    {details.enum && (
                                      <div className="mt-1 flex gap-1 flex-wrap">
                                        {details.enum.map((e: string) => <code key={e} className="text-[10px] text-slate-500 bg-white border border-slate-200 px-1 rounded">{e}</code>)}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Response Example */}
                      {route.response && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FileJson className="w-4 h-4" /> Response Example
                          </h4>
                          <div className="bg-[#1e1e2e] rounded-xl overflow-hidden shadow-inner">
                            <pre className="p-4 text-xs font-mono text-[#cdd6f4] overflow-x-auto">
                              {JSON.stringify(route.response.example, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </main>
      </div>
    </div>
  );
};
