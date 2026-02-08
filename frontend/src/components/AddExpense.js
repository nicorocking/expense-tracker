import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createExpense } from '../services/api';

function AddExpense() {
  const [formData, setFormData] = useState({
    type: 'food',
    amount: '',
    currency: 'ARS',
    country: 'AR',
    date: new Date().toISOString().split('T')[0],
    cuit: '',
    items: '',
    comment: ''
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          data.append(key, formData[key]);
        }
      });
      
      if (image) {
        data.append('image', image);
      }

      await createExpense(data);
      setSuccess('Gasto agregado exitosamente');
      
      // Reset form
      setFormData({
        type: 'food',
        amount: '',
        currency: 'ARS',
        country: 'AR',
        date: new Date().toISOString().split('T')[0],
        cuit: '',
        items: '',
        comment: ''
      });
      setImage(null);
      setImagePreview(null);
      
      setTimeout(() => {
        navigate('/expenses');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el gasto');
    } finally {
      setLoading(false);
    }
  };

  const expenseTypes = [
    { value: 'hairdresser', label: 'Peluquería' },
    { value: 'food', label: 'Comida' },
    { value: 'services', label: 'Servicios' },
    { value: 'mobility', label: 'Movilidad' },
    { value: 'residence', label: 'Residencia' },
    { value: 'diapers', label: 'Pañales' }
  ];

  return (
    <div className="main-content">
      <div className="container">
        <div className="card">
          <h2>Agregar Gasto</h2>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Tipo de Gasto *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                {expenseTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Monto *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                required
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label>Moneda</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
              >
                <option value="ARS">Pesos Argentinos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
                <option value="UYU">Pesos Uruguayos (UYU)</option>
              </select>
            </div>

            <div className="form-group">
              <label>País</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
              >
                <option value="AR">Argentina</option>
                <option value="UY">Uruguay</option>
              </select>
            </div>

            <div className="form-group">
              <label>Fecha *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>CUIT/RUT</label>
              <input
                type="text"
                name="cuit"
                value={formData.cuit}
                onChange={handleChange}
                placeholder="XX-XXXXXXXX-X"
              />
            </div>

            <div className="form-group">
              <label>Items</label>
              <textarea
                name="items"
                value={formData.items}
                onChange={handleChange}
                placeholder="Descripción de los productos o servicios"
              />
            </div>

            <div className="form-group">
              <label>Comentario</label>
              <textarea
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                placeholder="Notas adicionales"
              />
            </div>

            <div className="form-group">
              <label>Imagen/Factura</label>
              <div
                className={`upload-area ${dragActive ? 'dragging' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
              >
                <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p>Arrastra una imagen aquí o haz clic para seleccionar</p>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </div>
              
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                    className="btn btn-secondary"
                    style={{ marginTop: '10px', width: 'auto', padding: '8px 16px' }}
                  >
                    Eliminar imagen
                  </button>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Gasto'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddExpense;
