
import { User } from '@supabase/supabase-js';

export interface Profile {
  idUsuario: number;
  auth_id: string;
  nombre: string;
  correo: string;
  telefono: string;
  rol: 'Cliente' | 'Admin' | 'Recepcionista' | 'Empleado';
}

export interface Servicio {
  idServicio: number;
  nombre: string;
  descripcion: string;
  duracion: number; // in minutes
  precio: number;
}

export interface Empleado {
  idUsuario: number;
  nombre: string;
}

export interface Horario {
  idHorario: number;
  diaSemana: string; // e.g., 'Lunes', 'Martes'
  horaInicio: string; // e.g., '09:00'
  horaFin: string; // e.g., '17:00'
}

export interface EmpleadoServicioHorario {
  id: number;
  idEmpleado: number;
  idServicio: number;
  idHorario: number;
  Empleado: { nombre: string };
  Servicio: { nombre: string };
  Horario: { diaSemana: string; horaInicio: string; horaFin: string; };
}

export interface Reserva {
  idReserva: number;
  idUsuarioCliente: number;
  idEmpleado: number;
  idServicio: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  estado: 'activa' | 'cancelada' | 'realizada';
  Servicio: {
    nombre: string;
    duracion: number;
    precio: number;
  };
  Empleado: {
    nombre: string;
  };
  Usuario: {
    nombre: string;
    correo: string;
  };
}
