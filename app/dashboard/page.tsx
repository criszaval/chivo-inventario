'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, LogOut, Package, Edit3, Filter } from 'lucide-react'
import Swal from 'sweetalert2'

interface Product {
  id: string
  name: string
  category: string
  purchase_price: number
  sale_price: number
  size?: string
  stock: number
  image_url?: string
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState('todos')
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const router = useRouter()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('ropa')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [size, setSize] = useState('')
  const [stock, setStock] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los productos: ' + error.message,
        background: '#09090b',
        color: '#fff',
        confirmButtonColor: '#f59e0b'
      })
    } else {
      const items = data || []
      setProducts(items)
      filterItems(selectedCategory, items)
    }
  }

  const filterItems = (cat: string, items: Product[]) => {
    setSelectedCategory(cat)
    if (cat === 'todos') {
      setFilteredProducts(items)
    } else {
      setFilteredProducts(items.filter(p => p.category.toLowerCase() === cat.toLowerCase()))
    }
  }

  useEffect(() => {
    const checkUserAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      fetchProducts()
    }
    checkUserAndFetch()
  }, [router])

  const handleLogout = async () => {
    Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Saldrás del sistema de inventario',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#27272a',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      background: '#09090b',
      color: '#fff'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await supabase.auth.signOut()
        router.push('/login')
      }
    })
  }

  const openCreateModal = () => {
    setEditingId(null)
    setName('')
    setCategory('ropa')
    setPurchasePrice('')
    setSalePrice('')
    setSize('')
    setStock('')
    setImageFile(null)
    setIsOpenModal(true)
  }

  const openEditModal = (p: Product) => {
    setEditingId(p.id)
    setName(p.name)
    setCategory(p.category)
    setPurchasePrice(p.purchase_price.toString())
    setSalePrice(p.sale_price.toString())
    setSize(p.size || '')
    setStock(p.stock.toString())
    setImageFile(null)
    setIsOpenModal(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    let imageUrl = ''

    if (editingId && !imageFile) {
      const currentProd = products.find(p => p.id === editingId)
      if (currentProd) imageUrl = currentProd.image_url || ''
    }

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('products-images')
        .upload(filePath, imageFile, { upsert: true })

      if (uploadError) {
        setUploading(false)
        Swal.fire({
          icon: 'error',
          title: 'Error al subir imagen',
          text: uploadError.message,
          background: '#09090b',
          color: '#fff',
          confirmButtonColor: '#f59e0b'
        })
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('products-images')
        .getPublicUrl(filePath)

      imageUrl = publicUrlData.publicUrl
    }

    const productData = {
      name,
      category,
      purchase_price: parseFloat(purchasePrice),
      sale_price: parseFloat(salePrice),
      size,
      stock: parseInt(stock),
      image_url: imageUrl
    }

    let error = null

    if (editingId) {
      const res = await supabase.from('products').update(productData).eq('id', editingId)
      error = res.error
    } else {
      const res = await supabase.from('products').insert([productData])
      error = res.error
    }

    setUploading(false)

    if (!error) {
      setIsOpenModal(false)
      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: editingId ? 'Producto actualizado correctamente' : 'Producto agregado al inventario',
        timer: 2000,
        showConfirmButton: false,
        background: '#09090b',
        color: '#fff'
      })
      fetchProducts()
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        background: '#09090b',
        color: '#fff',
        confirmButtonColor: '#f59e0b'
      })
    }
  }

  const handleDelete = async (id: string) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará el producto permanentemente',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#27272a',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#09090b',
      color: '#fff'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { error } = await supabase.from('products').delete().eq('id', id)
        if (!error) {
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'El producto ha sido borrado',
            timer: 1500,
            showConfirmButton: false,
            background: '#09090b',
            color: '#fff'
          })
          fetchProducts()
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            background: '#09090b',
            color: '#fff',
            confirmButtonColor: '#f59e0b'
          })
        }
      }
    })
  }

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'ropa', label: 'Ropa' },
    { id: 'zapatos', label: 'Zapatos' },
    { id: 'gorra', label: 'Gorra' },
    { id: 'perfume', label: 'Perfume' },
    { id: 'cartera', label: 'Cartera' }
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar Pro */}
      <nav className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center bg-zinc-950 sticky top-0 z-40">
        <div>
          <h1 className="text-xl font-bold text-amber-400 tracking-wider">CHIVO FASHION</h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Estilo que impone - Inventario</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={openCreateModal} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg shadow-amber-500/20 transition-all">
            <Plus size={18} /> Nuevo Producto
          </button>
          <button onClick={handleLogout} className="text-zinc-400 hover:text-red-400 p-2 transition-colors" title="Cerrar sesión">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {/* Barra de Filtros por Categoría */}
      <div className="bg-zinc-950/60 border-b border-zinc-900 px-6 py-3 sticky top-[73px] z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-zinc-500 text-xs uppercase flex items-center gap-1 font-semibold mr-2 shrink-0">
            <Filter size={14} /> Filtrar:
          </span>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => filterItems(cat.id, products)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 uppercase tracking-wider ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Productos */}
      <main className="p-6 max-w-7xl mx-auto">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <Package size={64} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">No hay productos en esta categoría.</p>
            <p className="text-sm mt-1">Prueba seleccionando otra categoría o agrega un nuevo producto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => (
              <div key={p.id} className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl hover:border-amber-500/30 transition-all">
                <div>
                  <div className="h-48 bg-zinc-950 relative overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700">
                        <Package size={48} />
                      </div>
                    )}
                    <span className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-amber-400 text-xs px-2.5 py-1 rounded-full uppercase font-bold border border-amber-500/30">
                      {p.category}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1 truncate text-zinc-100">{p.name}</h3>
                    <div className="flex justify-between text-sm text-zinc-400 mb-3">
                      <span>Talla: <strong className="text-white">{p.size || 'N/A'}</strong></span>
                      <span>Stock: <strong className="text-amber-400">{p.stock} unids.</strong></span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-400 border-t border-zinc-800 pt-3">
                      <span>Compra: <strong className="text-zinc-300">${p.purchase_price}</strong></span>
                      <span>Venta: <strong className="text-amber-400 font-bold text-sm">${p.sale_price}</strong></span>
                    </div>
                  </div>
                </div>
                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <button onClick={() => openEditModal(p)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors">
                    <Edit3 size={14} /> Editar
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors">
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal para Crear / Editar Producto */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-amber-500/40 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-amber-400 mb-4">
              {editingId ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            </h2>
            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 uppercase mb-1">Nombre</label>
                <input type="text" placeholder="Ej: Camisa Oversize / Zapatos Nike" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white focus:outline-none focus:border-amber-400 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase mb-1">Categoría</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white focus:outline-none focus:border-amber-400 text-sm">
                  <option value="ropa">Ropa</option>
                  <option value="zapatos">Zapatos</option>
                  <option value="gorra">Gorra</option>
                  <option value="perfume">Perfume</option>
                  <option value="cartera">Cartera</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 uppercase mb-1">Precio Compra ($)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white focus:outline-none focus:border-amber-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 uppercase mb-1">Precio Venta ($)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={salePrice} onChange={e => setSalePrice(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white focus:outline-none focus:border-amber-400 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 uppercase mb-1">Talla</label>
                  <input type="text" placeholder="Ej: M, 42, Única" value={size} onChange={e => setSize(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white focus:outline-none focus:border-amber-400 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 uppercase mb-1">Stock</label>
                  <input type="number" placeholder="Cantidad" value={stock} onChange={e => setStock(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white focus:outline-none focus:border-amber-400 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase mb-1">Foto del Producto</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="w-full text-xs text-zinc-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer" />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsOpenModal(false)} className="w-1/2 bg-zinc-900 hover:bg-zinc-800 py-3 rounded-xl font-semibold text-sm transition-colors">Cancelarصر</button>
                <button type="submit" disabled={uploading} className="w-1/2 bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-amber-500/20">
                  {uploading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}