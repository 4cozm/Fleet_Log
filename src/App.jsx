import { useMemo, useState } from 'react';
import './App.css';
import TacticalFlow from './components/TacticalFlow';
import { MOCK_LOGS } from './data/mockData';
import { parseLog } from './utils/logParser';

const App = () => {
  const [selectedMinute, setSelectedMinute] = useState(null);

  const processedLogs = useMemo(() => {
    const start = new Date(MOCK_LOGS[0].timestamp.replace(/-/g, '/')).getTime();
    return MOCK_LOGS.map(l => ({
      ...l,
      time: new Date(l.timestamp.replace(/-/g, '/')).getTime(),
      minute: Math.floor((new Date(l.timestamp.replace(/-/g, '/')).getTime() - start) / 60000),
      parsed: parseLog(l.content)
    }));
  }, []);

  const { buckets, stats } = useMemo(() => {
    const buckets = new Map();
    let tOut = 0, tIn = 0, tRep = 0, kCount = 0, lCount = 0;
    
    processedLogs.forEach(l => {
      const idx = l.minute;
      if (!buckets.has(idx)) {
        buckets.set(idx, { 
          out: 0, in: 0, rep: 0, 
          timeStr: l.timestamp.substring(11, 16),
          logs: [] 
        });
      }
      const b = buckets.get(idx);
      const p = l.parsed;
      b.logs.push(l);

      if (p.type === 'dmg') {
        if (p.isOut) { b.out += p.val; tOut += p.val; }
        else { b.in += p.val; tIn += p.val; }
      } else if (p.type === 'rep') {
        b.rep += p.val; tRep += p.val;
      } else if (p.type === 'kill') {
        kCount++;
      } else if (p.type === 'loss') {
        lCount++;
      }
    });

    const duration = Math.max(1, buckets.size);
    return {
      buckets,
      stats: {
        avgOut: Math.floor(tOut / duration / 60),
        peakIn: Math.max(...Array.from(buckets.values()).map(b => b.in)),
        mitigation: tIn > 0 ? Math.min(100, (tRep / tIn) * 100).toFixed(1) : 0,
        kills: kCount,
        losses: lCount
      }
    };
  }, [processedLogs]);

  const chartData = useMemo(() => {
    const duration = Math.max(...Array.from(buckets.keys()));
    const W = 1200, H = 200;
    const maxVal = Math.max(...Array.from(buckets.values()).map(b => Math.max(b.out, b.in, b.rep)), 1000);

    const getBezier = (points) => {
      if (points.length < 2) return "";
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const m = (points[i].x + points[i+1].x) / 2;
        d += ` C ${m} ${points[i].y}, ${m} ${points[i+1].y}, ${points[i+1].x} ${points[i+1].y}`;
      }
      return d;
    };

    const ptsOut = [], ptsIn = [], ptsRep = [];
    for (let i = 0; i <= duration; i++) {
      const b = buckets.get(i) || { out: 0, in: 0, rep: 0 };
      const x = (i / duration) * W;
      ptsOut.push({ x, y: H - (b.out / maxVal) * H * 0.9 });
      ptsIn.push({ x, y: H - (b.in / maxVal) * H * 0.9 });
      ptsRep.push({ x, y: H - (b.rep / maxVal) * H * 0.9 });
    }

    return {
      pathOut: getBezier(ptsOut),
      pathIn: getBezier(ptsIn),
      pathRep: getBezier(ptsRep),
      width: W, height: H, duration
    };
  }, [buckets]);

  const filteredLogs = selectedMinute !== null ? buckets.get(selectedMinute)?.logs || [] : [];

  return (
    <div className="dashboard">
      <section className="stats-hero">
        <div className="stat-card card-blue">
          <div className="stat-label">평균 타격 화력</div>
          <div className="stat-value">{stats.avgOut.toLocaleString()}<span className="stat-unit">DPS</span></div>
        </div>
        <div className="stat-card card-red">
          <div className="stat-label">최고 피격 압박</div>
          <div className="stat-value">{stats.peakIn.toLocaleString()}<span className="stat-unit">PEAK</span></div>
        </div>
        <div className="stat-card card-green">
          <div className="stat-label">누적 복구 효율</div>
          <div className="stat-value">{stats.mitigation}<span className="stat-unit">%</span></div>
        </div>
        <div className="stat-card card-cyan">
          <div className="stat-label">전술 격침 / 손실</div>
          <div className="stat-value">
            <span style={{ color: 'var(--accent-blue)' }}>{stats.kills}</span>
            <span className="stat-unit" style={{ margin: '0 8px' }}>/</span>
            <span style={{ color: 'var(--accent-red)' }}>{stats.losses}</span>
          </div>
        </div>
      </section>

      <main className="main-content">
        <section className="viz-section">
          <div className="viz-header">
            <div className="viz-title">FORCE COMPARISON STREAM // 통합 화력 대조</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                전투 타임라인 (클릭 시 세부 관제 모드 전환)
            </div>
          </div>

          <div className="chart-container" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const min = Math.round((x / rect.width) * chartData.duration);
              setSelectedMinute(min);
          }}>
            <svg className="chart-svg" viewBox={`0 0 ${chartData.width} ${chartData.height}`} preserveAspectRatio="none">
              <line x1="0" y1="25%" x2="100%" y2="25%" className="axis-line" />
              <line x1="0" y1="50%" x2="100%" y2="50%" className="axis-line" />
              <line x1="0" y1="75%" x2="100%" y2="75%" className="axis-line" />
              
              <path d={chartData.pathIn + ` L ${chartData.width} ${chartData.height} L 0 ${chartData.height} Z`} className="pulse-area area-in" />
              <path d={chartData.pathIn} className="pulse-path path-in" />
              
              <path d={chartData.pathRep + ` L ${chartData.width} ${chartData.height} L 0 ${chartData.height} Z`} className="pulse-area area-rep" style={{ fill: 'var(--accent-green)', fillOpacity: 0.15 }} />
              <path d={chartData.pathRep} className="pulse-path path-rep" style={{ stroke: 'var(--accent-green)', strokeWidth: 1.5 }} />

              <path d={chartData.pathOut + ` L ${chartData.width} ${chartData.height} L 0 ${chartData.height} Z`} className="pulse-area area-out" />
              <path d={chartData.pathOut} className="pulse-path path-out" />

              {selectedMinute !== null && (
                  <line 
                      x1={(selectedMinute / chartData.duration) * chartData.width} 
                      y1="0" 
                      x2={(selectedMinute / chartData.duration) * chartData.width} 
                      y2="100%" 
                      className="time-cursor-line" 
                  />
              )}
            </svg>
          </div>
        </section>

        <section className="flow-section">
            <div className="section-label">TACTICAL NODE MAP // {selectedMinute !== null ? `T+${selectedMinute}M Focus` : 'Active Network'}</div>
            <TacticalFlow logs={selectedMinute !== null ? filteredLogs : processedLogs} />
        </section>

        <section className="log-section">
            <div className="viz-title" style={{ marginBottom: '15px' }}>COMBAT ARCHIVE</div>
            <div className="log-grid">
                {selectedMinute !== null ? (
                    filteredLogs.map((l, i) => {
                        const p = l.parsed;
                        let cardClass = p.isOut ? 'c-out' : 'c-in';
                        if (p.type === 'rep') cardClass = 'c-rep';
                        if (p.type === 'kill') cardClass = 'c-kill';
                        if (p.type === 'loss') cardClass = 'c-loss';

                        return (
                            <div key={i} className={`log-card ${cardClass}`}>
                                <img src={p.icon} className="ship-img" alt="" />
                                <div className="log-body">
                                    <div className="log-time">{l.timestamp.split(' ')[1]}</div>
                                    <div className="log-desc" dangerouslySetInnerHTML={{ __html: `<span class="highlight">${p.actor}</span> ➔ ${p.target}` }}></div>
                                </div>
                                {p.val > 0 && (
                                    <div className={`log-num num-${p.type === 'rep' ? 'green' : (p.isOut ? 'blue' : 'red')}`}>
                                        {p.val.toLocaleString()}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="no-data">
                        전술 타임라인의 특정 시점을 클릭하면<br/>
                        해당 분의 상세 화력 배분과<br/>
                        노드 맵이 동기화됩니다.
                    </div>
                )}
            </div>
        </section>
      </main>
    </div>
  );
};

export default App;
