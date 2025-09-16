import { Timestamp } from "firebase/firestore";
export interface clientesItf {
    id: string,
    nombre: string,
    direccion: string,
    notas?: string,
    telefono?: string,
    debe?: number,
    ultimoPago?: Timestamp,
}