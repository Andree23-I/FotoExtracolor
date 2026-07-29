import React, { useState, useEffect } from 'react';
import './AdminPage.css';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [categories, setCategories] = useState([]);
  const [imagesByCategory, setImagesByCategory] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  
  const [servicesData, setServicesData] = useState({it: [], en: []});
  const [editingLang, setEditingLang] = useState('it');
  
  // Login State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetch('/api.php?action=getPortfolio')
      .then(res => res.json())
      .then(data => {
        if (data && data.categories) {
          setCategories(data.categories);
          setImagesByCategory(data.imagesByCategory || {});
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Errore fetch admin:", err);
        const saved = localStorage.getItem('portfolio_categories');
        if (saved) setCategories(JSON.parse(saved));
        setIsLoading(false);
      });

    fetch('/api.php?action=getServices')
      .then(res => res.json())
      .then(data => {
        if (data && data.it && data.en) {
          setServicesData(data);
        }
      })
      .catch(err => {
        const localS = localStorage.getItem('custom_services');
        if (localS) setServicesData(JSON.parse(localS));
      });
  }, []);
  const [newCategory, setNewCategory] = useState('');

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const catName = newCategory.trim();
      
      try {
        const res = await fetch('/api.php?action=createCategory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: catName })
        });
        const data = await res.json();
        
        if (data.success) {
          const updatedCategories = [...categories, catName];
          setCategories(updatedCategories);
          localStorage.setItem('portfolio_categories', JSON.stringify(updatedCategories));
          setNewCategory('');
        } else {
          alert("Errore dal server: " + data.error);
        }
      } catch (err) {
        alert("Errore di connessione al server PHP.");
      }
    }
  };

  const handleDeleteCategory = async (category) => {
    if (window.confirm(`Sei sicuro di voler eliminare la scheda "${category}" e TUTTE le sue foto?`)) {
      try {
        const res = await fetch(`/api.php?action=deleteCategory&name=${encodeURIComponent(category)}`);
        const data = await res.json();
        
        if (data.success) {
          const updatedCategories = categories.filter((c) => c !== category);
          setCategories(updatedCategories);
          localStorage.setItem('portfolio_categories', JSON.stringify(updatedCategories));
        } else {
          alert("Errore dal server: " + data.error);
        }
      } catch (err) {
        alert("Errore di connessione al server PHP.");
      }
    }
  };

  const handleUploadPhoto = async (e, cat) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('category', cat);

    try {
      const res = await fetch('/api.php?action=uploadImage', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        const catId = cat.toLowerCase().replace(/\s+/g, '');
        const currentImages = imagesByCategory[catId] || [];
        setImagesByCategory({
          ...imagesByCategory,
          [catId]: [...currentImages, data.url]
        });
      } else {
        alert("Errore upload: " + data.error);
      }
    } catch (err) {
      alert("Sei in locale: impossibile salvare sul server. L'upload funzionerà appena carichi su Register.it!");
    }
  };

  const handleDeletePhoto = async (url, cat) => {
    if (!window.confirm("Sicuro di voler eliminare questa foto definitivamente?")) return;
    
    try {
      const res = await fetch('/api.php?action=deleteImage', {
        method: 'POST', // Note: using POST because PHP script reads php://input payload
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (data.success) {
        const catId = cat.toLowerCase().replace(/\s+/g, '');
        const currentImages = imagesByCategory[catId] || [];
        setImagesByCategory({
          ...imagesByCategory,
          [catId]: currentImages.filter(img => img !== url)
        });
      } else {
        alert("Errore eliminazione: " + data.error);
      }
    } catch (err) {
      alert("Sei in locale senza PHP. Simulo l'eliminazione visiva.");
      const catId = cat.toLowerCase().replace(/\s+/g, '');
      const currentImages = imagesByCategory[catId] || [];
      setImagesByCategory({
        ...imagesByCategory,
        [catId]: currentImages.filter(img => img !== url)
      });
    }
  };

  const handleServiceChange = (index, field, value) => {
    const updatedLangArray = [...servicesData[editingLang]];
    updatedLangArray[index] = { ...updatedLangArray[index], [field]: value };
    setServicesData({
      ...servicesData,
      [editingLang]: updatedLangArray
    });
  };

  const saveServices = async () => {
    try {
      const res = await fetch('/api.php?action=saveServices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: servicesData })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('custom_services', JSON.stringify(servicesData));
        alert("Servizi salvati con successo!");
      } else {
        alert("Errore salvataggio: " + data.error);
      }
    } catch (err) {
      alert("Salvato in locale (Modalità offline senza PHP)");
      localStorage.setItem('custom_services', JSON.stringify(servicesData));
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'fotoextracolor@100') {
      setIsAuthenticated(true);
    } else {
      alert("Password errata!");
    }
  };

  const autoTranslate = async () => {
    if (!window.confirm("Vuoi tradurre automaticamente tutti i testi dall'Italiano all'Inglese? (Sovrascriverà i testi inglesi attuali)")) return;
    
    setIsLoading(true);
    try {
      const itServices = servicesData.it;
      const newEnServices = [...servicesData.en];
      
      const translateText = async (text) => {
        if (!text || text.trim() === '') return "";
        try {
          const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=it&tl=en&dt=t&q=${encodeURIComponent(text)}`);
          const data = await res.json();
          return data[0].map(item => item[0]).join('');
        } catch (e) {
          console.error(e);
          return text;
        }
      };
      
      for (let i = 0; i < itServices.length; i++) {
        const srv = itServices[i];
        const enSrv = { ...newEnServices[i] };
        
        enSrv.title = await translateText(srv.title);
        enSrv.subtitle = await translateText(srv.subtitle);
        enSrv.description = await translateText(srv.description);
        
        newEnServices[i] = enSrv;
      }
      
      setServicesData({
        ...servicesData,
        en: newEnServices
      });
      setEditingLang('en');
      alert("Traduzione automatica completata!");
    } catch (err) {
      alert("Errore di connessione al servizio di traduzione.");
    }
    setIsLoading(false);
  };

  const moveCategory = (index, direction) => {
    const newCategories = [...categories];
    if (direction === 'up' && index > 0) {
      [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
    } else if (direction === 'down' && index < newCategories.length - 1) {
      [newCategories[index + 1], newCategories[index]] = [newCategories[index], newCategories[index + 1]];
    } else {
      return;
    }
    setCategories(newCategories);
    localStorage.setItem('portfolio_categories', JSON.stringify(newCategories));
    
    // Invia ordine al server se disponibile
    fetch('/api.php?action=reorderCategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newCategories })
    }).catch(() => console.log("Ordine salvato in locale"));
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-page-container" style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
        <form onSubmit={handleLogin} className="admin-section" style={{textAlign: 'center', maxWidth: '400px', width: '100%'}}>
          <h2 style={{marginBottom: '2rem'}}>Accesso Riservato</h2>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="admin-input"
            style={{display: 'block', width: '100%', marginBottom: '1.5rem'}}
            placeholder="Inserisci la password"
          />
          <button type="submit" className="admin-btn-primary" style={{width: '100%'}}>Entra</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-header">
        <h1>Pannello di Amministrazione</h1>
        <p>Gestisci il portfolio e i servizi del sito</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setActiveTab('portfolio')}
        >
          Gestione Portfolio
        </button>
        <button 
          className={`admin-tab ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          Gestione Servizi
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'portfolio' && activeCategory && (
          <div className="admin-section">
            <button className="admin-btn-secondary" onClick={() => setActiveCategory(null)}>
              &larr; Torna alle schede
            </button>
            <h2 style={{marginTop: '1.5rem'}}>Gestione Foto: {activeCategory}</h2>
            
            <div style={{marginBottom: '2rem'}}>
              <input 
                type="file" 
                id="photo-upload" 
                accept="image/*" 
                onChange={(e) => handleUploadPhoto(e, activeCategory)} 
                style={{display: 'none'}} 
              />
              <label htmlFor="photo-upload" className="admin-btn-primary" style={{display: 'inline-block', padding: '0.8rem 1.5rem', cursor: 'pointer'}}>
                + Carica Nuova Foto
              </label>
            </div>
            
            <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
               {(imagesByCategory[activeCategory.toLowerCase().replace(/\s+/g, '')] || []).map((url) => (
                  <div key={url} style={{position: 'relative', width: '150px', height: '150px'}}>
                     <img src={url} alt="portfolio" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px'}} />
                     <button 
                       className="admin-btn-danger" 
                       style={{position: 'absolute', top: '5px', right: '5px', padding: '0.2rem 0.5rem', minWidth: '30px'}}
                       onClick={() => handleDeletePhoto(url, activeCategory)}
                     >X</button>
                  </div>
               ))}
               {(imagesByCategory[activeCategory.toLowerCase().replace(/\s+/g, '')] || []).length === 0 && (
                 <p className="admin-empty">Nessuna foto in questa scheda.</p>
               )}
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && !activeCategory && (
          <div className="admin-section">
            <h2>Schede Portfolio</h2>
            
            <form onSubmit={handleAddCategory} className="admin-add-form">
              <input 
                type="text" 
                placeholder="Nuova scheda (es. Ritratti)" 
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="admin-input"
              />
              <button type="submit" className="admin-btn-primary">Aggiungi Scheda</button>
            </form>

            <div className="admin-list">
              {categories.map((category, index) => (
                <div key={category} className="admin-list-item">
                  <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.2rem'}}>
                      <button 
                        onClick={() => moveCategory(index, 'up')} 
                        disabled={index === 0}
                        style={{background: 'none', border: 'none', color: index === 0 ? 'gray' : 'white', cursor: index === 0 ? 'default' : 'pointer'}}
                      >&#9650;</button>
                      <button 
                        onClick={() => moveCategory(index, 'down')} 
                        disabled={index === categories.length - 1}
                        style={{background: 'none', border: 'none', color: index === categories.length - 1 ? 'gray' : 'white', cursor: index === categories.length - 1 ? 'default' : 'pointer'}}
                      >&#9660;</button>
                    </div>
                    <span className="admin-item-title">{category}</span>
                  </div>
                  <div className="admin-item-actions">
                    <button className="admin-btn-secondary" onClick={() => setActiveCategory(category)}>
                      Gestisci Foto
                    </button>
                    <button 
                      className="admin-btn-danger"
                      onClick={() => handleDeleteCategory(category)}
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <p className="admin-empty">Nessuna scheda presente.</p>}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="admin-section">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h2>Gestione Servizi</h2>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                 <button className={`admin-tab ${editingLang === 'it' ? 'active' : ''}`} onClick={() => setEditingLang('it')} style={{padding: '0.5rem 1rem'}}>Italiano</button>
                 <button className={`admin-tab ${editingLang === 'en' ? 'active' : ''}`} onClick={() => setEditingLang('en')} style={{padding: '0.5rem 1rem'}}>Inglese</button>
                 <button className="admin-btn-secondary" onClick={autoTranslate} style={{padding: '0.5rem 1rem', marginLeft: '1rem', background: 'rgba(52, 152, 219, 0.2)', color: '#3498db', border: '1px solid rgba(52, 152, 219, 0.4)'}}>
                   🤖 Traduzione Auto (IT &rarr; EN)
                 </button>
              </div>
            </div>
            
            {servicesData[editingLang] && servicesData[editingLang].length > 0 ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                {servicesData[editingLang].map((srv, index) => (
                  <div key={srv.id} style={{background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)'}}>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Titolo Servizio</label>
                    <input 
                      className="admin-input" 
                      style={{width: '100%', marginBottom: '1rem', fontWeight: 'bold'}} 
                      value={srv.title} 
                      onChange={(e) => handleServiceChange(index, 'title', e.target.value)} 
                    />
                    
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Sottotitolo Evidenziato (Opzionale)</label>
                    <input 
                      className="admin-input" 
                      style={{width: '100%', marginBottom: '1rem'}} 
                      value={srv.subtitle || ''} 
                      placeholder="Es: Foto, film e riprese aeree..."
                      onChange={(e) => handleServiceChange(index, 'subtitle', e.target.value)} 
                    />
                    
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Descrizione Completa</label>
                    <textarea 
                      className="admin-input" 
                      style={{width: '100%', minHeight: '80px', resize: 'vertical'}} 
                      value={srv.description} 
                      onChange={(e) => handleServiceChange(index, 'description', e.target.value)} 
                    />
                  </div>
                ))}
                
                <div style={{marginTop: '1rem', display: 'flex', justifyContent: 'flex-end'}}>
                  <button className="admin-btn-primary" style={{padding: '1rem 2rem', fontSize: '1.1rem'}} onClick={saveServices}>Salva Tutte le Modifiche</button>
                </div>
              </div>
            ) : (
              <p className="admin-empty">Nessun servizio caricato. Verifica la connessione al server o il salvataggio locale.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
