
    const rawData = `name,year,rank,stat_val,played_val
Dana Barros,1990,191,0.0,81
Dana Barros,1991,153,0.3,66
Dana Barros,1992,125,0.6,75
Dana Barros,1993,120,0.7,69
Dana Barros,1994,92,1.2,81
Dana Barros,1995,8,5.3,82
Dana Barros,1996,98,1.3,80
Dana Barros,1997,292,-0.1,24
Dana Barros,1998,103,1.1,80
Dana Barros,1999,103,0.7,50
Dana Barros,2000,295,-0.1,72
Dana Barros,2001,220,0.0,60
Dana Barros,2002,368,-0.3,29
Dana Barros,2003,,,
Dana Barros,2004,211,0.0,1`;

    const reggieRawData = `name,year,rank,stat_val,played_val
Reggie Miller,1988,75,1.2,82
Reggie Miller,1989,38,2.8,74
Reggie Miller,1990,14,4.6,82
Reggie Miller,1991,16,4.5,82
Reggie Miller,1992,20,3.8,82
Reggie Miller,1993,12,4.4,82
Reggie Miller,1994,18,4.1,79
Reggie Miller,1995,16,4.3,81
Reggie Miller,1996,17,3.9,76
Reggie Miller,1997,10,5.2,81
Reggie Miller,1998,14,4.4,81
Reggie Miller,1999,18,2.5,50
Reggie Miller,2000,17,4.0,81
Reggie Miller,2001,32,3.5,81
Reggie Miller,2002,24,3.6,79
Reggie Miller,2003,61,2.1,70
Reggie Miller,2004,39,2.8,80
Reggie Miller,2005,83,1.6,66`;

    const minYear = 1985;
    const maxYear = 2010;
    const years = [...Array(maxYear - minYear + 1)].map((_, idx) => minYear + idx);

    const parsed = rawData.trim().split('\n').slice(1).map(line => {
      const [name, year, rank, stat_val, played_val] = line.split(',');
      return {
        name: name.trim(),
        year: Number(year.trim()),
        rank: rank.trim() ? Number(rank.trim()) : null,
        vorp: stat_val.trim() ? stat_val.trim() : null,
        games: played_val.trim() ? played_val.trim() : null
      };
    }).filter(d => d.name === 'Dana Barros' && d.rank !== null && d.year >= 1990 && d.year <= 2015);

    const reggieData = reggieRawData.trim().split('\n').slice(1).map(line => {
      const [name, year, rank, stat_val, played_val] = line.split(',');
      return {
        name: name.trim(),
        year: Number(year.trim()),
        rank: rank.trim() ? Number(rank.trim()) : null,
        vorp: stat_val.trim() ? stat_val.trim() : null,
        games: played_val.trim() ? played_val.trim() : null
      };
    }).filter(d => d.name === 'Reggie Miller' && d.rank !== null && d.year >= minYear && d.year <= maxYear);
    const svgWidth = 1000;
    const svgHeight = 520;
    const margin = { top: 30, right: 40, bottom: 50, left: 90 };
    const chartWidth = svgWidth - margin.left - margin.right;
    const chartHeight = svgHeight - margin.top - margin.bottom;
    const minRank = 20;
    const maxRank = 400;

    const rankToY = rank => {
      const clamped = Math.min(maxRank, Math.max(minRank, rank));
      return margin.top + ((clamped - minRank) / (maxRank - minRank)) * chartHeight;
    };

    const xPadding = 28;
    const yearToX = year => {
      return margin.left + xPadding + ((year - minYear) / (maxYear - minYear)) * (chartWidth - xPadding * 2);
    };

    const svg = document.querySelector('svg');
    const grid = document.getElementById('grid');
    const axes = document.getElementById('axes');
    const reggieLineGroup = document.getElementById('reggie-line');
    const lineGroup = document.getElementById('line');
    const reggiePointsGroup = document.getElementById('reggie-points');
    const pointsGroup = document.getElementById('points');
    const annotationsGroup = document.getElementById('annotations');
    const compareToggle = document.getElementById('compareToggle');

    const rankTicks = [400, 350, 300, 250, 200, 150, 100, 50, 20];
    rankTicks.forEach(rank => {
      const y = rankToY(rank);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', margin.left);
      line.setAttribute('y1', y);
      line.setAttribute('x2', svgWidth - margin.right);
      line.setAttribute('y2', y);
      line.setAttribute('class', 'grid-line');
      grid.appendChild(line);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', margin.left - 16);
      label.setAttribute('y', y + 4);
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('class', 'rank-label');
      label.textContent = rank;
      grid.appendChild(label);
    });

    const medianRank = 153;
    const medianY = rankToY(medianRank);
    const medianLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    medianLine.setAttribute('x1', margin.left);
    medianLine.setAttribute('y1', medianY);
    medianLine.setAttribute('x2', svgWidth - margin.right);
    medianLine.setAttribute('y2', medianY);
    medianLine.setAttribute('stroke', '#444');
    medianLine.setAttribute('stroke-width', 2);
    medianLine.setAttribute('stroke-dasharray', '8 6');
    axes.appendChild(medianLine);

    const medianLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    medianLabel.setAttribute('x', svgWidth - margin.right - 10);
    medianLabel.setAttribute('y', medianY - 10);
    medianLabel.setAttribute('text-anchor', 'end');
    medianLabel.setAttribute('class', 'rank-label');
    medianLabel.setAttribute('font-weight', '700');
    medianLabel.textContent = 'MEDIAN: 153rd';
    axes.appendChild(medianLabel);

    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', margin.left + xPadding);
    xAxis.setAttribute('y1', svgHeight - margin.bottom);
    xAxis.setAttribute('x2', svgWidth - margin.right - xPadding);
    xAxis.setAttribute('y2', svgHeight - margin.bottom);
    xAxis.setAttribute('class', 'axis-line');
    axes.appendChild(xAxis);

    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', margin.left + xPadding);
    yAxis.setAttribute('y1', margin.top);
    yAxis.setAttribute('x2', margin.left + xPadding);
    yAxis.setAttribute('y2', svgHeight - margin.bottom);
    yAxis.setAttribute('class', 'axis-line');
    axes.appendChild(yAxis);

    years.forEach(year => {
      if (year % 5 === 0) {
        const x = yearToX(year);
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', x);
        tick.setAttribute('y1', svgHeight - margin.bottom);
        tick.setAttribute('x2', x);
        tick.setAttribute('y2', svgHeight - margin.bottom + 8);
        tick.setAttribute('stroke', '#444');
        tick.setAttribute('stroke-width', 1);
        axes.appendChild(tick);

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', svgHeight - margin.bottom + 26);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('class', 'year-label');
        label.textContent = year;
        axes.appendChild(label);
      }
    });

    const sortedData = parsed.sort((a, b) => a.year - b.year);
    const points = sortedData.map(d => ({ x: yearToX(d.year), y: rankToY(d.rank), year: d.year, rank: d.rank, vorp: d.vorp, games: d.games }));

    const maxRankPoint = points.reduce((best, item) => {
      if (item.rank <= 20 && (!best || item.rank < best.rank)) {
        return item;
      }
      return best;
    }, null);

    const pathParts = [];
    points.forEach((point, idx) => {
      if (idx === 0) {
        pathParts.push(`M ${point.x} ${point.y}`);
      } else {
        const prev = points[idx - 1];
        pathParts.push(`L ${prev.x} ${point.y}`);
        pathParts.push(`L ${point.x} ${point.y}`);
      }
    });

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathParts.join(' '));
    path.setAttribute('class', 'step-line');
    lineGroup.appendChild(path);

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerHTML = `<div class="tooltip-header"></div>
                         <div class="tooltip-row"><span>RANK</span><strong class="tooltip-rank"></strong></div>
                         <div class="tooltip-row"><span>VORP</span><strong class="tooltip-vorp"></strong></div>
                         <div class="tooltip-row"><span>GAMES</span><strong class="tooltip-games"></strong></div>`;
    document.body.appendChild(tooltip);

    const showTooltip = (event, point) => {
      tooltip.querySelector('.tooltip-header').textContent = point.year;
      tooltip.querySelector('.tooltip-rank').textContent = point.rank;
      tooltip.querySelector('.tooltip-vorp').textContent = point.vorp || '—';
      tooltip.querySelector('.tooltip-games').textContent = point.games || '—';
      tooltip.style.left = `${event.clientX + 14}px`;
      tooltip.style.top = `${event.clientY - 20}px`;
      tooltip.classList.add('visible');
    };

    const hideTooltip = () => {
      tooltip.classList.remove('visible');
    };

    points.forEach(point => {
      const target = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      target.setAttribute('cx', point.x);
      target.setAttribute('cy', point.y);
      target.setAttribute('r', 12);
      target.setAttribute('class', 'hit-area');

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const radius = point === maxRankPoint ? 9 : 6;
      dot.setAttribute('cx', point.x);
      dot.setAttribute('cy', point.y);
      dot.setAttribute('r', radius);
      dot.setAttribute('class', point === maxRankPoint ? 'dot highlight-dot' : 'dot');

      target.addEventListener('mouseenter', event => {
        dot.setAttribute('r', radius + 2);
        showTooltip(event, point);
      });
      target.addEventListener('mousemove', event => showTooltip(event, point));
      target.addEventListener('mouseleave', () => {
        dot.setAttribute('r', radius);
        hideTooltip();
      });

      pointsGroup.appendChild(target);
      pointsGroup.appendChild(dot);
    });

    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', margin.left);
    title.setAttribute('y', margin.top - 10);
    title.setAttribute('class', 'year-label');
    title.setAttribute('font-size', '14');
    title.setAttribute('font-weight', '700');
    title.textContent = 'NBA ranking axis is inverted: 400 at bottom, 20 near top.';
    svg.appendChild(title);

    const drawSeries = (data, groupLine, groupPoints, lineClass, pointClass, pointRadius) => {
      const sorted = data.sort((a, b) => a.year - b.year);
      const points = sorted.map(d => ({ x: yearToX(d.year), y: rankToY(d.rank), year: d.year, rank: d.rank, vorp: d.vorp, games: d.games }));
      const pathParts = [];
      points.forEach((point, idx) => {
        if (idx === 0) {
          pathParts.push(`M ${point.x} ${point.y}`);
        } else {
          const prev = points[idx - 1];
          pathParts.push(`L ${prev.x} ${point.y}`);
          pathParts.push(`L ${point.x} ${point.y}`);
        }
      });

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathParts.join(' '));
      path.setAttribute('class', lineClass);
      groupLine.appendChild(path);

      points.forEach(point => {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', point.x);
        dot.setAttribute('cy', point.y);
        dot.setAttribute('r', pointRadius);
        dot.setAttribute('class', pointClass);
        groupPoints.appendChild(dot);
      });

      return points;
    };

    const barrosPoints = drawSeries(parsed, lineGroup, pointsGroup, 'step-line', 'dot', 6);
    const reggiePoints = drawSeries(reggieData, reggieLineGroup, reggiePointsGroup, 'reggie-line', 'reggie-dot', 4);

    compareToggle.addEventListener('change', event => {
      const show = event.target.checked;
      reggieLineGroup.classList.toggle('visible', show);
      reggiePointsGroup.querySelectorAll('circle').forEach(dot => dot.classList.toggle('visible', show));
    });
  