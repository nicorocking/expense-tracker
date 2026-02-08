import React, { useState, useEffect } from 'react';
import { getDashboard } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await getDashboard();
      setDashboard(response.data);
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const categoryLabels = {
    'hairdresser': 'Peluquería',
    'food': 'Comida',
    'services': 'Servicios',
    'mobility': 'Movilidad',
    'residence': 'Residencia',
    'diapers': 'Pañales'
  };

  return (
    <div className="main-content">
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>Dashboard</h2>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(dashboard.monthTotal)}</div>
            <div className="stat-label">Este mes</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(dashboard.yearTotal)}</div>
            <div className="stat-label">Este año</div>
          </div>
        </div>

        {dashboard.byCategory && dashboard.byCategory.length > 0 && (
          <div className="card">
            <h3>Gastos por Categoría (Este mes)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboard.byCategory}>
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
                <Bar dataKey="total" fill="#667eea" name="Total (ARS)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {dashboard.recentExpenses && dashboard.recentExpenses.length > 0 && (
          <div className="card">
            <h3>Gastos Recientes</h3>
            <ul className="expense-list">
              {dashboard.recentExpenses.map((expense) => (
                <li key={expense.id} className="expense-item">
                  <div className="expense-header">
                    <span className="expense-type">
                      {categoryLabels[expense.type] || expense.type}
                    </span>
                    <span className="expense-amount">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                  <div className="expense-date">
                    {new Date(expense.date).toLocaleDateString('es-AR')}
                  </div>
                  {expense.comment && (
                    <div style={{ marginTop: '5px', fontSize: '14px', color: '#666' }}>
                      {expense.comment}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
