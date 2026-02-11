import React, { useState } from 'react';
import { getMonthlyReport, getAnnualReport } from '../services/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function Reports() {
  const [reportType, setReportType] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let response;
      if (reportType === 'monthly') {
        response = await getMonthlyReport(year, month);
      } else {
        response = await getAnnualReport(year);
      }
      setReportData(response.data);
    } catch (error) {
      console.error('Error al cargar reporte:', error);
      alert('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const categoryLabels = {
    'hairdresser': 'Peluquería',
    'food': 'Alimentación',
    'services': 'Servicios',
    'mobility': 'Movilidad',
    'residence': 'Residencia',
    'diapers': 'Pañales',
    'entertainment': 'Ocio y Entretenimiento',
    'health': 'Salud'
  };

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

  const renderMonthlyReport = () => {
    if (!reportData || !reportData.data) return null;

    const totalAmount = reportData.data.reduce((sum, item) => sum + item.total_ars, 0);

    return (
      <div>
        <h3>Reporte Mensual - {reportData.period}</h3>
        
        <div className="stat-card" style={{ marginBottom: '20px' }}>
          <div className="stat-value">{formatCurrency(totalAmount)}</div>
          <div className="stat-label">Total del Mes</div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h4>Por Categoría</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="type" 
                tickFormatter={(value) => categoryLabels[value] || value}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(value) => categoryLabels[value] || value}
              />
              <Legend />
              <Bar dataKey="total_ars" fill="#667eea" name="Total (ARS)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4>Distribución</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${categoryLabels[entry.type] || entry.type}: ${((entry.total_ars / totalAmount) * 100).toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="total_ars"
              >
                {reportData.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: '30px' }}>
          <h4>Detalle</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Categoría</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Cantidad</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {reportData.data.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{categoryLabels[item.type] || item.type}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{item.count}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(item.total_ars)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAnnualReport = () => {
    if (!reportData || !reportData.data) return null;

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Agrupar por mes
    const monthlyData = {};
    reportData.data.forEach(item => {
      const monthNum = parseInt(item.month);
      if (!monthlyData[monthNum]) {
        monthlyData[monthNum] = { month: monthNames[monthNum - 1], total: 0 };
      }
      monthlyData[monthNum].total += item.total_ars;
    });

    const chartData = Object.values(monthlyData);
    const totalAmount = chartData.reduce((sum, item) => sum + item.total, 0);

    return (
      <div>
        <h3>Reporte Anual - {reportData.year}</h3>
        
        <div className="stat-card" style={{ marginBottom: '20px' }}>
          <div className="stat-value">{formatCurrency(totalAmount)}</div>
          <div className="stat-label">Total del Año</div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h4>Evolución Mensual</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#667eea" name="Total (ARS)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4>Por Mes</h4>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="total" fill="#667eea" name="Total (ARS)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="main-content">
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>Reportes</h2>

        <div className="card">
          <div className="filters-grid">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Tipo de Reporte</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Año</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                min="2020"
                max="2030"
              />
            </div>

            {reportType === 'monthly' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Mes</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleDateString('es-AR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={fetchReport}
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Cargando...' : 'Generar Reporte'}
              </button>
            </div>
          </div>
        </div>

        {reportData && (
          <div className="card">
            {reportType === 'monthly' ? renderMonthlyReport() : renderAnnualReport()}
          </div>
        )}

        {!reportData && !loading && (
          <div className="card">
            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              Selecciona los parámetros y genera un reporte
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
