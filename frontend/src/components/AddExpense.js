import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createExpense } from '../services/api';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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
  const [imagePath, setImagePath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ocrMessage, setOcrMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const processImageWithOCR = async (file) => {
    setProcessingOCR(true);
    setOcrMessage('Procesando imagen y extrayendo datos...');
    setError('');

    try {
      const data = new FormData();
      data.append('image', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/ocr/process`, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const extracted = response.data.extractedData;
        
        setFormData(prev => ({
          ...prev,
          amount: extracted.amount || prev.amount,
          date: extracted.date || prev.date,
          cuit: extracted.cuit || prev.cuit,
          items: extracted.items || prev.items,
          type: extracted.category || prev.type, // Usar categoría sugerida por AI
          comment: extracted.vendor ? `Comercio: ${extracted.vendor}` : prev.comment
        }));

        setImagePath(response.data.imagePath);
        
        const foundData = [];
        if (extracted.amount) foundData.push('monto');
        if (extracted.date) foundData.push('fecha');
        if (extracted.cuit) foundData.push('CUIT');
        if (extracted.items) foundData.push('items');
        if (extracted.category) foundData.push('categoría');
        if (extracted.vendor) foundData.push('comercio');

        if (foundData.length > 0) {
          setOcrMessage(`✓ Datos extraídos con IA: ${foundData.join(', ')}. Puedes editarlos antes de guardar.`);
        } else {
          setOcrMessage('⚠ No se pudieron extraer datos automáticamente. Completa el formulario manualmente.');
        }
      }
    } catch (err) {
      console.error('Error en OCR:', err);
      setOcrMessage('⚠ Error al procesar la imagen. Completa los datos manualmente.');
    } finally {
      setProcessingOCR(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor sube una imagen (JPG, PNG)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('La imagen no debe superar 10MB');
        return;
      }

      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      await processImageWithOCR(file);
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

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      if (!file.type.startsWith('image/')) {
        setError('Por favor sube una imagen (JPG, PNG)');
        return;
      }

      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      await processImageWithOCR(file);
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

      const response = await createExpense(data);
      
      if (response.data.usedOCR) {
        setSuccess('¡Gasto creado con datos extraídos de la factura!');
      } else {
        setSuccess('¡Gasto creado exitosamente!');
      }
      
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
      setImagePath(null);
      setOcrMessage('');
      
      setTimeout(() => {
        navigate('/expenses');
      }, 1500);
    } catch (err) {
      console.error('Error creating expense:', err);
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
          {ocrMessage && (
            <div style={{
              background: ocrMessage.includes('✓') ? '#e8f5e9' : '#fff3cd',
              color: ocrMessage.includes('✓') ? '#2e7d32' : '#856404',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '15px',
              fontSize: '14px',
              border: `1px solid ${ocrMessage.includes('✓') ? '#4caf50' : '#ffc107'}`
            }}>
              {ocrMessage}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>📸 Subir Factura/Ticket (Opcional)</label>
              <div
                className={`upload-area ${dragActive ? 'dragging' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !processingOCR && document.getElementById('file-input').click()}
              >
                {processingOCR ? (
                  <div>
                    <div className="loading" style={{ padding: '10px' }}>
                      🔄 Procesando imagen...
                    </div>
                    <p style={{ fontSize: '14px', color: '#666' }}>
                      Extrayendo datos de la factura
                    </p>
                  </div>
                ) : (
                  <>
                    <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p>Arrastra una imagen aquí o haz clic para seleccionar</p>
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                      Los datos se extraerán automáticamente
                    </p>
                  </>
                )}
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  disabled={processingOCR}
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
                      setImagePath(null);
                      setOcrMessage('');
                    }}
                    className="btn btn-secondary"
                    style={{ marginTop: '10px', width: 'auto', padding: '8px 16px' }}
                  >
                    Eliminar imagen
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Tipo de Gasto *</label>
              <select name="type" value={formData.type} onChange={handleChange} required>
                {expenseTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Monto *</label>
              <input type="number" name="amount" value={formData.amount} onChange={handleChange} step="0.01" required placeholder="0.00" />
            </div>

            <div className="form-group">
              <label>Moneda</label>
              <select name="currency" value={formData.currency} onChange={handleChange}>
                <option value="ARS">Pesos Argentinos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
                <option value="UYU">Pesos Uruguayos (UYU)</option>
              </select>
            </div>

            <div className="form-group">
              <label>País</label>
              <select name="country" value={formData.country} onChange={handleChange}>
                <option value="AR">Argentina</option>
                <option value="UY">Uruguay</option>
              </select>
            </div>

            <div className="form-group">
              <label>Fecha *</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>CUIT/RUT</label>
              <input type="text" name="cuit" value={formData.cuit} onChange={handleChange} placeholder="XX-XXXXXXXX-X" />
            </div>

            <div className="form-group">
              <label>Items</label>
              <textarea name="items" value={formData.items} onChange={handleChange} placeholder="Descripción de los productos o servicios" />
            </div>

            <div className="form-group">
              <label>Comentario</label>
              <textarea name="comment" value={formData.comment} onChange={handleChange} placeholder="Notas adicionales" />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || processingOCR}>
              {loading ? 'Guardando...' : processingOCR ? 'Procesando imagen...' : 'Guardar Gasto'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddExpense;
