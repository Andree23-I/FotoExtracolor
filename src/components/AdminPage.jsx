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

  const handleAddService = () => {
    const newId = Date.now().toString();
    const newServiceIt = {
      id: newId,
      title: "Nuovo Servizio",
      description: "Descrizione del servizio",
      subtitle: "",
      iconName: "IconCamera",
      featured: false
    };
    const newServiceEn = {
      id: newId,
      title: "New Service",
      description: "Service description",
      subtitle: "",
      iconName: "IconCamera",
      featured: false
    };

    setServicesData({
      ...servicesData,
      it: [...(servicesData.it || []), newServiceIt],
      en: [...(servicesData.en || []), newServiceEn]
    });
  };

  const handleRemoveService = (index) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo servizio?")) return;
    const itServices = [...servicesData.it];
    const enServices = [...servicesData.en];
    itServices.splice(index, 1);
    enServices.splice(index, 1);
    setServicesData({
      ...servicesData,
      it: itServices,
      en: enServices
    });
  };

  const moveService = (index, direction) => {
    const itServices = [...servicesData.it];
    const enServices = [...servicesData.en];
    
    if (direction === 'up' && index > 0) {
      [itServices[index - 1], itServices[index]] = [itServices[index], itServices[index - 1]];
      [enServices[index - 1], enServices[index]] = [enServices[index], enServices[index - 1]];
    } else if (direction === 'down' && index < itServices.length - 1) {
      [itServices[index + 1], itServices[index]] = [itServices[index], itServices[index + 1]];
      [enServices[index + 1], enServices[index]] = [enServices[index], enServices[index + 1]];
    } else {
      return;
    }
    
    setServicesData({
      ...servicesData,
      it: itServices,
      en: enServices
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
      <div className="admin-page-container admin-login-wrapper">
        <form onSubmit={handleLogin} className="admin-section admin-login-card">
          <h2>Accesso Riservato</h2>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="admin-input admin-login-input"
            placeholder="Inserisci la password"
          />
          <button type="submit" className="admin-btn-primary admin-login-btn">Entra</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-header">
        <h1>Pannello di Amministrazione</h1>
        <p>Gestisci la galleria e i servizi del sito</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setActiveTab('portfolio')}
        >
          Gestione Galleria
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
            <h2 className="admin-section-subtitle">Gestione Foto: {activeCategory}</h2>
            
            <div className="admin-upload-wrapper">
              <input 
                type="file" 
                id="photo-upload" 
                accept="image/*" 
                onChange={(e) => handleUploadPhoto(e, activeCategory)} 
                style={{display: 'none'}} 
              />
              <label htmlFor="photo-upload" className="admin-btn-primary admin-upload-label">
                + Carica Nuova Foto
              </label>
            </div>
            
            <div className="admin-photo-grid">
               {(imagesByCategory[activeCategory.toLowerCase().replace(/\s+/g, '')] || []).map((url) => (
                  <div key={url} className="admin-photo-item">
                     <img src={url} alt="portfolio" className="admin-photo-img" />
                     <button 
                       className="admin-btn-danger admin-photo-delete"
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
            <h2>Schede Galleria</h2>
            
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
                  <div className="admin-category-info">
                    <div className="admin-reorder-btns">
                      <button 
                        onClick={() => moveCategory(index, 'up')} 
                        disabled={index === 0}
                        className="admin-arrow-btn"
                        aria-label="Sposta su"
                      >&#9650;</button>
                      <button 
                        onClick={() => moveCategory(index, 'down')} 
                        disabled={index === categories.length - 1}
                        className="admin-arrow-btn"
                        aria-label="Sposta giù"
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
            <div className="admin-services-header">
              <h2>Gestione Servizi</h2>
              <div className="admin-services-lang-group">
                 <div className="admin-lang-tabs">
                   <button className={`admin-tab ${editingLang === 'it' ? 'active' : ''}`} onClick={() => setEditingLang('it')}>Italiano</button>
                   <button className={`admin-tab ${editingLang === 'en' ? 'active' : ''}`} onClick={() => setEditingLang('en')}>Inglese</button>
                 </div>
                 <button className="admin-btn-translate" onClick={autoTranslate}>
                   🤖 Traduzione Auto (IT &rarr; EN)
                 </button>
              </div>
            </div>
            
            {servicesData[editingLang] && servicesData[editingLang].length > 0 ? (
              <div className="admin-services-list">
                {servicesData[editingLang].map((srv, index) => (
                  <div key={srv.id || index} className="admin-service-card">
                    <div className="admin-service-card-top">
                      <div className="admin-reorder-horizontal">
                        <button 
                          className="admin-btn-secondary admin-move-btn" 
                          onClick={() => moveService(index, 'up')}
                          disabled={index === 0}
                          title="Sposta su"
                        >&#9650;</button>
                        <button 
                          className="admin-btn-secondary admin-move-btn" 
                          onClick={() => moveService(index, 'down')}
                          disabled={index === servicesData[editingLang].length - 1}
                          title="Sposta giù"
                        >&#9660;</button>
                      </div>
                      <button className="admin-btn-danger" onClick={() => handleRemoveService(index)}>Elimina</button>
                    </div>

                    <div className="admin-service-row">
                      <div className="admin-form-group">
                        <label>Titolo Servizio</label>
                        <input 
                          className="admin-input" 
                          value={srv.title || ''} 
                          onChange={(e) => handleServiceChange(index, 'title', e.target.value)} 
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Icona</label>
                        <select 
                          className="admin-input admin-select" 
                          value={srv.iconName || 'IconCamera'} 
                          onChange={(e) => handleServiceChange(index, 'iconName', e.target.value)}
                        >
                          <option value="IconCamera">Fotocamera (Eventi)</option>
                          <option value="IconPrinter">Stampante (Stampe)</option>
                          <option value="IconCalendar">Calendario (Cerimonie)</option>
                          <option value="IconFilm">Pellicola (Sviluppo)</option>
                          <option value="IconConvert">Conversione (VHS)</option>
                          <option value="IconDrone">Drone (Riprese Aeree)</option>
                          <option value="IconGift">Regalo (Gadget)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="admin-form-group">
                      <label>Sottotitolo Evidenziato (Opzionale)</label>
                      <input 
                        className="admin-input" 
                        value={srv.subtitle || ''} 
                        placeholder="Es: Foto, film e riprese aeree..."
                        onChange={(e) => handleServiceChange(index, 'subtitle', e.target.value)} 
                      />
                    </div>
                    
                    <div className="admin-form-group">
                      <label>Descrizione Completa</label>
                      <textarea 
                        className="admin-input admin-textarea" 
                        value={srv.description || ''} 
                        onChange={(e) => handleServiceChange(index, 'description', e.target.value)} 
                      />
                    </div>

                    <label className="admin-featured-checkbox">
                      <input 
                        type="checkbox" 
                        checked={srv.featured || false} 
                        onChange={(e) => handleServiceChange(index, 'featured', e.target.checked)} 
                      />
                      Metti in evidenza (Layout speciale)
                    </label>
                  </div>
                ))}
                
                <div className="admin-service-actions">
                  <button className="admin-btn-secondary" onClick={handleAddService}>+ Aggiungi Servizio</button>
                  <button className="admin-btn-primary" onClick={saveServices}>Salva Tutte le Modifiche</button>
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
