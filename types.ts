
import { User } from '@supabase/supabase-js';

export interface Profile {
  // CRÍTICO: El campo que mapea a auth.users.id es 'id' y es un string (UUID)
  id: string; 
  // CRÍTICO: El campo 'idUsuario: number;' y 'auth_id: string' son incorrectos o redundantes.
  // Usamos 'id' para la PK/FK de auth.users.
  
  nombre: string;
  correo: string; // Se mantiene, asumiendo que el trigger lo copia de auth.users.email
  telefono: string;
  rol: 'Cliente' | 'Admin' | 'Recepcionista' | 'Empleado';
  // Los demás campos de la tabla 'usuario' (usuario_nuevo, fecha_registro, cargo, created_at)
  // deben agregarse aquí si son necesarios para el frontend.
}

export interface Servicio {
  idServicio: number; // Asumo que es 'idservicio' en tu BD, si es UUID cámbialo a string
  nombre: string;
  descripcion: string;
  duracion: number; // en horas
  precio: number;
  imagenUrl?: string; // URL de la imagen del servicio
  tipo?: string; // Tipo de servicio (Cabello, Pestañas, etc.)
}

export interface Empleado {
  // CRÍTICO: El ID del empleado es el ID de la tabla 'usuario', que es 'id' (string)
  id: string; 
  nombre: string;
}

export interface Horario {
  idHorario: number; // Asumo que es 'idhorario' en tu BD, si es UUID cámbialo a string
  diaSemana: string; // e.g., 'Lunes', 'Martes'
  horaInicio: string; // e.g., '09:00'
  horaFin: string; // e.g., '17:00'
}

export interface EmpleadoServicioHorario {
  id: number; // Asumo que es la PK autoincremental, si es UUID cámbialo a string
  idEmpleado: string; // CRÍTICO: Debe ser string para coincidir con Profile/Usuario.id
  idServicio: number; // Se mantiene
  idHorario: number; // Se mantiene
  Empleado: { nombre: string };
  Servicio: { nombre: string };
  Horario: { diaSemana: string; horaInicio: string; horaFin: string; };
}

export interface Reserva {
  idReserva: number; // Asumo que es la PK autoincremental/uuid, si es UUID cámbialo a string
  idUsuarioCliente: string; // CRÍTICO: Debe ser string para coincidir con Profile.id
  idEmpleado: string; // CRÍTICO: Debe ser string para coincidir con Profile.id
  idServicio: number; // Se mantiene
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  estado: 'activa' | 'cancelada' | 'realizada';
  // Las propiedades de la relación (joins)
  Servicio: {
    nombre: string;
    duracion: number;
    precio: number;
  };
  Empleado: {
    nombre: string;
  };
  Usuario: {
    telefono: string;
    nombre: string;
    correo: string;
  };
}
