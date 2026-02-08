import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExpenses, deleteExpense, getCurrentRates } from '../services/api';

function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [rates, setRates] = useState({ usdToArs: 1000, uyuToArs: 25 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    country: ''
  });
  const [selectedExpense, setSelectedExpense] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExpenses();
    fetchRates();
  }, [filters]);

  const fetchExpenses = async () => {
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.type) params.type = filters.type;
      if (filters.country) params.country = filters.country;

      const response = await getExpenses(params);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error al cargar gastos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRates = async () => {
    try {
      const response = await getCurrentRates();
      setRates(response.data);
    } catch (error) {
      console.error('Error al cargar tasas:', error);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este gasto?')) {
      try {
        await deleteExpense(id);
        fetchExpenses();
        setSelectedExpense(null);
      } catch (error) {
        console.error('Error al eliminar gasto:', error);
        alert('Error al eliminar el gasto');
      }
    }
  };

  const formatCurrency = (amount, currency = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const expenseTypes = [
    { value: '', label: 'Todos' },
    { value: 'hairdresser', label: 'Peluquería' },
    { value: 'food', label: 'Comida' },
    { value: 'services', label: 'Servicios' },
    { value: 'mobility', label: 'Movilidad' },
    { value: 'residence', label: 'Residencia' },
    { value: 'diapers', label: 'Pañales' }
  ];

  const categoryLabels = {
    'hairdresser': 'Peluquería',
    'food': 'Comida',
    'services': 'Servicios',
    'mobility': 'Movilidad',
    'residence': 'Residencia',
    'diapers': 'Pañales'
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="main-content">
      <div className="container">
        <h2 style={{ marginBottom: '20px' }}>Mis Gastos</h2>

        <div className="filters">
          <div className="filters-grid">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Desde</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Hasta</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Tipo</label>
              <select
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
              >
                {expenseTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>País</label>
              <select
                name="country"
                value={filters.country}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                <option value="AR">Argentina</option>
                <option value="UY">Uruguay</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Total: {expenses.length} gastos</h3>
          
          {expenses.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              No hay gastos para mostrar
            </p>
          ) : (
            <ul className="expense-list">
              {expenses.map((expense) => (
                <li
                  key={expense.id}
                  className="expense-item"
                  onClick={() => setSelectedExpense(expense)}
                >
                  <div className="expense-header">
                    <span className="expense-type">
                      {categoryLabels[expense.type] || expense.type}
                    </span>
                    <span className="expense-amount">
                      {formatCurrency(expense.amount, expense.currency)}
                    </span>
                  </div>
                  
                  <div className="expense-date">
                    {new Date(expense.date).toLocaleDateString('es-AR')} - {expense.country}
                  </div>

                  <div className="expense-details">
                    <span>USD: {formatCurrency(expense.amountUSD, 'USD')}</span>
                    <span>UYU: {formatCurrency(expense.amountUYU, 'UYU')}</span>
                  </div>

                  {expense.comment && (
                    <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                      {expense.comment}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Tasas de Cambio Actuales</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <strong>USD → ARS:</strong> ${rates.usdToArs?.toFixed(2)}
            </div>
            <div>
              <strong>UYU → ARS:</strong> ${rates.uyuToArs?.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {selectedExpense && (
        <div className="modal-overlay" onClick={() => setSelectedExpense(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalle del Gasto</h3>
              <button className="modal-close" onClick={() => setSelectedExpense(null)}>
                ×
              </button>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <strong>Tipo:</strong> {categoryLabels[selectedExpense.type] || selectedExpense.type}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <strong>Monto:</strong> {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <strong>Equivalencias:</strong>
              <div>USD: {formatCurrency(selectedExpense.amountUSD, 'USD')}</div>
              <div>UYU: {formatCurrency(selectedExpense.amountUYU, 'UYU')}</div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <strong>Fecha:</strong> {new Date(selectedExpense.date).toLocaleDateString('es-AR')}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <strong>País:</strong> {selectedExpense.country === 'AR' ? 'Argentina' : 'Uruguay'}
            </div>

            {selectedExpense.cuit && (
              <div style={{ marginBottom: '15px' }}>
                <strong>CUIT/RUT:</strong> {selectedExpense.cuit}
              </div>
            )}

            {selectedExpense.items && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Items:</strong> {selectedExpense.items}
              </div>
            )}

            {selectedExpense.comment && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Comentario:</strong> {selectedExpense.comment}
              </div>
            )}

            {selectedExpense.image_path && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Factura:</strong>
                <img
                  src={`http://localhost:3001${selectedExpense.image_path}`}
                  alt="Factura"
                  style={{ width: '100%', marginTop: '10px', borderRadius: '8px' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(selectedExpense.id)}
              >
                Eliminar
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedExpense(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="fab" onClick={() => navigate('/add-expense')}>
        +
      </button>
    </div>
  );
}

export default ExpenseList;
