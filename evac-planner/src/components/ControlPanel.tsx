import React, { useState, useEffect } from 'react';
import { geocode, getDirections, requestTomTomRouteAnalysis } from '../utils/api';

interface ControlPanelProps {
  setRouteData: (data: any) => void;
  blockages: any[];
  startPoint: [number, number] | null;
  endPoint: [number, number] | null;
  setStartPoint: (p: [number, number]) => void;
  setEndPoint: (p: [number, number]) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  setRouteData,
  blockages,
  startPoint,
  endPoint,
  setStartPoint,
  setEndPoint,
}) => {
  const [search, setSearch] = useState('');
  const [travelMode, setTravelMode] = useState('foot-walking');
  const [loading, setLoading] = useState(false);
  const [ttAnalysis, setTTAnalysis] = useState<any>(null);

  useEffect(() => {
    const recalculateRoute = async () => {
      if (!startPoint || !endPoint) {
        setRouteData(null);
        setTTAnalysis(null);
        return;
      }
      setLoading(true);

      const avoid_polygons = blockages.length > 0
        ? {
            type: 'MultiPolygon',
            coordinates: blockages.map(b => [b.coords.map(([lat, lng]) => [lng, lat])])
          }
        : undefined;

      try {
        const data = await getDirections(
          [
            [startPoint[1], startPoint[0]],
            [endPoint[1], endPoint[0]]
          ],
          avoid_polygons,
          travelMode
        );
        setRouteData(data);

        // Call TomTom Route Analysis
        // const coords = [
        //   [startPoint[1], startPoint[0]],
        //   [endPoint[1], endPoint[0]]
        // ];
        // const ttResult = await requestTomTomRouteAnalysis(coords);
        // setTTAnalysis(ttResult);
      } catch (error) {
        console.error('Error fetching directions:', error);
        setRouteData(null);
        setTTAnalysis(null);
      } finally {
        setLoading(false);
      }
    };

    recalculateRoute();
    // eslint-disable-next-line
  }, [blockages, startPoint, endPoint, travelMode, setRouteData]);

  const handleSearch = async () => {
    if (!search.trim()) return;
    const results = await geocode(search);
    if (results && results.length > 0) {
      setStartPoint([results[0].lat, results[0].lon]);
    }
  };

  const handleClearRoute = () => {
    setRouteData(null);
    setTTAnalysis(null);
  };

  return (
    <div>
      <h4>Control Panel</h4>
      <div className="mb-3">
        <label>Search Location</label>
        <div className="input-group">
          <input
            className="form-control"
            placeholder="Enter address or landmark"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-outline-secondary" onClick={handleSearch}>
            <i className="bi bi-search"></i>
          </button>
        </div>
      </div>
      <div className="mb-3">
        <label>Start Point</label>
        <input
          className="form-control"
          value={startPoint ? `${startPoint[0]}, ${startPoint[1]}` : ''}
          readOnly
        />
      </div>
      <div className="mb-3">
        <label>Destination Point</label>
        <input
          className="form-control"
          value={endPoint ? `${endPoint[0]}, ${endPoint[1]}` : ''}
          readOnly
        />
      </div>
      <div className="mb-3">
        <label>Travel Mode</label>
        <select
          className="form-select"
          value={travelMode}
          onChange={(e) => setTravelMode(e.target.value)}
        >
          <option value="foot-walking">Walking</option>
          <option value="driving-car">Driving</option>
        </select>
      </div>
      <div className="d-grid gap-2">
        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Calculating...' : 'Calculate Route'}
        </button>
        <button className="btn btn-outline-warning" onClick={handleClearRoute}>
          Clear Route
        </button>
      </div>
      {ttAnalysis && (
        <div className="mt-4">
          <h5>TomTom Route Analysis</h5>
          <div><b>Job ID:</b> {ttAnalysis.jobId}</div>
          <div><b>Status:</b> {ttAnalysis.status}</div>
          {ttAnalysis.resultUrls && (
            <div>
              <b>Result URLs:</b>
              <ul>
                {Object.entries(ttAnalysis.resultUrls).map(([k, v]) => (
                  <li key={k}><a href={v as string} target="_blank" rel="noopener noreferrer">{k}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
