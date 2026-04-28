const mongoose = require('mongoose');
require('dotenv').config();
const Producto = require('./models/Productos');

const productos = [
     {
    nombre: "Hamburguesa Clásica",
    descripcion: "Carne, queso y papas",
    precio: 18000,
    categoria: "plato_principal",
    stock: 50,
    tiempoPrep: 15,
    restaurante: {
      nombre: "Burger House Pereira",
      direccion: "Cra 7 #20-30",
      ciudad: "Pereira",
      lat: 4.8133,
      lng: -75.6961
    }
  },
  {
    nombre: "Alitas BBQ",
    descripcion: "Alitas con salsa BBQ",
    precio: 16000,
    categoria: "entrada",
    stock: 40,
    tiempoPrep: 20,
    restaurante: {
      nombre: "Wings Zone",
      direccion: "Av Circunvalar",
      ciudad: "Pereira",
      lat: 4.8145,
      lng: -75.6940
    }
  },
  {
    nombre: "Combo Pizza + Coca-Cola",
    descripcion: "Pizza personal + bebida",
    precio: 28000,
    categoria: "combo",
    stock: 30,
    tiempoPrep: 25,
    restaurante: {
      nombre: "Pizza Express",
      direccion: "Centro Pereira",
      ciudad: "Pereira",
      lat: 4.8120,
      lng: -75.6955
    }
  },
  {
    nombre: "Brownie con Helado",
    descripcion: "Postre delicioso",
    precio: 9000,
    categoria: "postre",
    stock: 20,
    tiempoPrep: 10,
    restaurante: {
      nombre: "Sweet House",
      direccion: "Calle 14",
      ciudad: "Pereira",
      lat: 4.8150,
      lng: -75.6930
    }
  },
  {
    nombre: "Limonada Natural",
    descripcion: "Bebida refrescante",
    precio: 6000,
    categoria: "bebida",
    stock: 100,
    tiempoPrep: 5,
    restaurante: {
      nombre: "Fresh Drinks",
      direccion: "Parque Arboleda",
      ciudad: "Pereira",
      lat: 4.8160,
      lng: -75.6920
    }
  },
  {
    nombre: "Pizza Pepperoni",
    descripcion: "Pizza con pepperoni y queso",
    precio: 25000,
    categoria: "plato_principal",
    imagen: "https://images.unsplash.com/photo-1601924582975-7d76b8f5b8d1",
    stock: 40,
    tiempoPrep: 20,
    ubicacion: {
      direccion: "Cra 7 #21-30",
      ciudad: "Pereira",
      coordenadas: { lat: 4.8133, lng: -75.6961 }
    }
  },
  {
    nombre: "Sushi Roll",
    descripcion: "Sushi con salmón y aguacate",
    precio: 30000,
    categoria: "plato_principal",
    imagen: "https://images.unsplash.com/photo-1553621042-f6e147245754",
    stock: 30,
    tiempoPrep: 25,
    ubicacion: {
      direccion: "Av Circunvalar #10-45",
      ciudad: "Pereira",
      coordenadas: { lat: 4.8145, lng: -75.6946 }
    }
  },
  {
    nombre: "Coca-Cola",
    descripcion: "Bebida gaseosa",
    precio: 5000,
    categoria: "bebida",
    imagen: "https://images.unsplash.com/photo-1580910051074-3eb694886505",
    stock: 100,
    tiempoPrep: 1,
    ubicacion: {
      direccion: "Centro Comercial Victoria",
      ciudad: "Pereira",
      coordenadas: { lat: 4.8120, lng: -75.6940 }
    }
  },
  {
    nombre: "Brownie",
    descripcion: "Postre de chocolate",
    precio: 8000,
    categoria: "postre",
    imagen: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c",
    stock: 20,
    tiempoPrep: 10,
    ubicacion: {
      direccion: "Cra 8 #23-15",
      ciudad: "Pereira",
      coordenadas: { lat: 4.8138, lng: -75.6952 }
    }
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    await Producto.deleteMany();
    await Producto.insertMany(productos);

    console.log("Productos insertados con ubicación");
    process.exit();
  } catch (error) {
    console.error(error);
  }
}

seed();