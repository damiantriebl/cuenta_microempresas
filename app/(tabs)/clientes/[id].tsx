import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  View,
  StyleSheet,
  Text,
  Button,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  FlatList,
} from 'react-native';
import { db } from '@/firebaseConfig';
import {
  collection,
  getDocs,
  orderBy,
  query,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  where,
  updateDoc,
  limit,
  setDoc,
} from 'firebase/firestore';
import EventModule from '@/components/EventModule';
import { EventoTy } from '@/schemas/eventoTy';
import DatePickerModule from '@/components/DatePicker';
import { timestampToDate } from '@/hooks/timestampToDate';
import calcularTiempoDesde from '@/hooks/calcularTiempoDesde';
import { useAuth } from '@/context/AuthProvider';
type ProductoItem = {
  id: string;
  input: string;
  color: string;
  tipo: 'input' | 'entrego';
};
type DisplaySeparator = { type: 'separator'; id: string };
type DisplayEvent = { type: 'event'; event: (EventoTy & { acumulado: number }) };
type DisplayItem = DisplaySeparator | DisplayEvent;
export default function EventsScreen() {
  const [eventos, setEventos] = useState<(EventoTy & { acumulado: number })[]>([]);
  const { id: idCliente } = useLocalSearchParams();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<'bajar' | 'entrego'>('bajar');
  const [notas, setNotas] = useState('');
  const [borrado, setBorrado] = useState(false);
  const [editado, setEditado] = useState(false);
  const [creado, setCreado] = useState<Date>(new Date());
  const [actualizado, setActualizado] = useState<Date>(new Date());
  const [cantidad, setCantidad] = useState<string>('');
  const [precioUnitario, setPrecioUnitario] = useState<string>('');
  const [producto, setProducto] = useState('');
  const [productoColor, setProductoColor] = useState('');
  const [ganancia, setGanancia] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [precioHistorico, setPrecioHistorico] = useState({
    precio: 0,
    fecha: new Date(),
  });
  const [precioActual, setPrecioActual] = useState(precioHistorico.precio.toString());
  const { empresaId } = useAuth();
  const fetchEvents = async () => {
    if (!empresaId) return;
    const q = query(
      collection(db, 'empresas', empresaId, 'clientes', idCliente as string, 'eventos'),
      where('borrado', '==', false),
      orderBy('creado', 'asc'),
    );
    const snap = await getDocs(q);
    const eventosData = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    let acumulado = 0;
    const eventosWithAcumulado = eventosData.map((evento: any) => {
      let valorEvento = 0;
      if (evento.tipo === 'bajar') {
        const cantidad = evento.cantidad ?? 0;
        const precioUnitario = evento.precioUnitario ?? 0;
        const precioHistorico = precioActual ? parseFloat(precioActual) : 0;
        const gananciaEv = evento.ganancia ?? 0;
        valorEvento = -(cantidad * (precioUnitario + gananciaEv + precioHistorico));
      } else if (evento.tipo === 'entrego') {
        valorEvento = evento.monto ?? 0;
      }
      acumulado += valorEvento;
      return { ...evento, acumulado };
    });
    setEventos(eventosWithAcumulado.reverse() as (EventoTy & { acumulado: number })[]);
  };
  useEffect(() => {
    fetchEvents();
  }, [idCliente, empresaId]);
  const fetchProducts = async () => {
    try {
      if (!empresaId) return;
      const productsDocRef = doc(db, 'empresas', empresaId, 'configuracion', 'productos');
      const docSnap = await getDoc(productsDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const items = data.items || [];
        setProductos(items);
      } else {
        const legacyRef = doc(db, 'configuracion', 'productos');
        const legacySnap = await getDoc(legacyRef);
        if (legacySnap.exists()) {
          const data = legacySnap.data();
          const items = data.items || [];
          setProductos(items);
          await setDoc(productsDocRef, { items });
        } else {
        }
      }
    } catch (error) {
      console.error(error);
      alert('Error al obtener los productos');
    }
  };
  const fetchLatestPrice = async () => {
    try {
      if (!empresaId) return;
      const precioHistoricoRef = collection(db, 'empresas', empresaId, 'precioHistorico');
      const latestPriceQuery = query(precioHistoricoRef, orderBy('fecha', 'desc'), limit(1));
      const querySnapshot = await getDocs(latestPriceQuery);
      if (!querySnapshot.empty) {
        const latestPrice = querySnapshot.docs[0].data();
        setPrecioHistorico({
          precio: latestPrice.precio,
          fecha: timestampToDate(latestPrice.fecha)
        });
        setPrecioActual(latestPrice.precio.toString());
      } else {
      }
    } catch (error) {
      console.error('Error al obtener el último precio:', error);
      alert('Error al obtener el último precio');
    }
  };
  useEffect(() => {
    fetchEvents();
    fetchProducts();
    fetchLatestPrice()
  }, [idCliente, empresaId]);
  const handleSaveEvent = async () => {
    try {
      const newEventBase = {
        idCliente: idCliente as string,
        notas,
        borrado,
        editado,
        creado: Timestamp.fromDate(creado),
        actualizado: Timestamp.fromDate(actualizado),
      };
      let newEvent: any;
      if (tipo === 'bajar') {
        if (!cantidad || !precioUnitario || !producto.trim()) {
          Alert.alert('Error', 'Por favor complete todos los campos para un evento de tipo Bajar.');
          return;
        }
        newEvent = {
          ...newEventBase,
          tipo: 'bajar',
          cantidad: parseFloat(cantidad),
          precioUnitario: parseFloat(precioUnitario),
          ganancia: ganancia ? parseFloat(ganancia) : 0,
          producto,
          productoColor,
        };
      } else {
        if (!monto) {
          Alert.alert('Error', 'Por favor ingrese el monto para un evento de tipo Entrego.');
          return;
        }
        newEvent = {
          ...newEventBase,
          tipo: 'entrego',
          monto: parseFloat(monto),
        };
      }
      if (!empresaId) return;
      if (editingEventId) {
        await updateDoc(doc(db, 'empresas', empresaId, 'clientes', idCliente as string, 'eventos', editingEventId), newEvent);
        setEditingEventId(null);
      } else {
        await addDoc(collection(db, 'empresas', empresaId, 'clientes', idCliente as string, 'eventos'), newEvent);
      }
      setModalVisible(false);
      Alert.alert('Éxito', 'Evento guardado con éxito.');
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar el evento.');
    }
  };
  const handleEditEvent = (event: EventoTy & { acumulado: number }) => {
    setEditingEventId(event.id);
    setTipo(event.tipo);
    setNotas(event.notas || '');
    setBorrado(event.borrado);
    setEditado(event.editado);
    setCreado(event.creado.toDate());
    setActualizado(event.actualizado.toDate());
    if (event.tipo === 'bajar') {
      setCantidad((event.cantidad ?? 0).toString());
      setPrecioUnitario((event.precioUnitario ?? 0).toString());
      setGanancia((event.ganancia ?? 0).toString());
      setProducto(event.producto);
      setProductoColor(event.productoColor || '');
    } else {
      setMonto((event.monto ?? 0).toString());
    }
    setModalVisible(true);
  };
  const resetForm = () => {
    setTipo('bajar');
    setNotas('');
    setBorrado(false);
    setEditado(false);
    setCreado(new Date());
    setActualizado(new Date());
    setCantidad('');
    setPrecioUnitario('');
    setProducto('');
    setProductoColor('');
    setMonto('');
  };
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>Agregar Evento</Text>
      </TouchableOpacity>
      <ScrollView style={styles.eventListContainer}>
        {eventos.length === 0 ? (
          <Text style={styles.loadingText}>Cargando eventos...</Text>
        ) : (
          (() => {
            const asc = [...eventos].reverse();
            const itemsAsc: DisplayItem[] = [];
            let prevAcum = 0;
            for (let i = 0; i < asc.length; i++) {
              const e = asc[i];
              if (e.tipo === 'entrego' && prevAcum < 0) {
                const monto = e.monto ?? 0;
                const needed = -prevAcum;
                if (monto > needed) {
                  const part1 = { ...e, id: e.id + '-part1', monto: needed, acumulado: 0 } as (EventoTy & { acumulado: number });
                  itemsAsc.push({ type: 'event', event: part1 });
                  itemsAsc.push({ type: 'separator', id: e.id + '-sep' });
                  const remainder = monto - needed;
                  const part2 = { ...e, id: e.id + '-part2', monto: remainder, acumulado: e.acumulado } as (EventoTy & { acumulado: number });
                  itemsAsc.push({ type: 'event', event: part2 });
                  prevAcum = part2.acumulado;
                  continue;
                } else if (monto === needed) {
                  itemsAsc.push({ type: 'event', event: e });
                  itemsAsc.push({ type: 'separator', id: e.id + '-sep' });
                  prevAcum = 0;
                  continue;
                }
              }
              itemsAsc.push({ type: 'event', event: e });
              prevAcum = e.acumulado;
            }
            const itemsDesc = itemsAsc.reverse();
            return itemsDesc.map((item) => {
              if (item.type === 'separator') {
                return (
                  <View key={item.id} style={styles.separatorContainer}>
                    <Text style={styles.separatorText}>Canceló la deuda</Text>
                  </View>
                );
              }
              const ev = item.event;
              return (
                <View key={ev.id} style={styles.eventItemContainer}>
                  <EventModule {...ev} handleEditEvento={() => handleEditEvent(ev)} />
                </View>
              );
            });
          })()
        )}
      </ScrollView>
      {}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <ScrollView contentContainerStyle={styles.modalContainer}>
          <Text style={styles.modalTitle}>{editingEventId ? 'Editar Evento' : 'Agregar Nuevo Evento'}</Text>
          <View style={styles.section}>
            <Text style={styles.label}>Tipo de Evento:</Text>
            <View style={styles.tipoContainer}>
              <TouchableOpacity
                style={[styles.tipoButton, tipo === 'bajar' && styles.tipoButtonSelected]}
                onPress={() => setTipo('bajar')}
              >
                <Text style={styles.tipoButtonText}>Bajar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipoButton, tipo === 'entrego' && styles.tipoButtonSelected]}
                onPress={() => setTipo('entrego')}
              >
                <Text style={styles.tipoButtonText}>Entrego</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.section}>
            {tipo === 'bajar' ? (
              <View style={styles.sectionBolsa}>
                <View style={styles.tipoContainer}>
                  <Text style={styles.label}>Precio de la bolsa:</Text>
                  <Text style={styles.fechaPrecio}>
                    mismo precio desde hace {calcularTiempoDesde(precioHistorico.fecha)}
                  </Text>
                </View>
                <View style={styles.tipoContainer}>
                  {editingEventId ? (
                    <TextInput
                      style={styles.input}
                      value={precioActual}
                      onChangeText={(text) => {
                        const numericText = text.replace(/[^0-9]/g, '');
                        setPrecioActual(numericText);
                      }}
                      placeholder="Precio actual"
                      keyboardType="numeric"
                    />
                  ) : (
                    <Text style={styles.labelPrice}>{precioHistorico.precio.toString()}</Text>
                  )}
                </View>
                <Text style={styles.label}>Cantidad:</Text>
                <TextInput
                  style={styles.input}
                  value={cantidad}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    setCantidad(numericText);
                  }} placeholder="Cantidad"
                  keyboardType="numeric"
                />
                <Text style={styles.label}>Precio Unitario:</Text>
                <TextInput
                  style={styles.input}
                  value={precioUnitario}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    setPrecioUnitario(numericText);
                  }}
                  placeholder="Precio Unitario"
                  keyboardType="numeric"
                />
                <Text style={styles.label}>Ganancia:</Text>
                <TextInput
                  style={styles.input}
                  value={ganancia}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    setGanancia(numericText);
                  }}
                  placeholder="Ganancia"
                  keyboardType="numeric"
                />
                <Text style={styles.label}>Producto:</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowProductPicker(true)}
                >
                  <Text
                    style={
                      producto ? styles.selectedProductText : styles.placeholderText
                    }
                  >
                    {producto ? producto : 'Seleccione un producto'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.label}>Monto:</Text>
                <TextInput
                  style={styles.input}
                  value={monto}
                  onChangeText={setMonto}
                  placeholder="Monto"
                  keyboardType="numeric"
                />
              </View>
            )}
            <View style={styles.section}>
              <Text style={styles.label}>Creado:</Text>
              <DatePickerModule
                value={creado}
                onChange={(selectedDate) => setCreado(selectedDate)}
              />
              <Text style={styles.label}>Actualizado:</Text>
              <DatePickerModule
                value={actualizado}
                onChange={(selectedDate) => setActualizado(selectedDate)}
              />
            </View>
            <Text style={styles.label}>Notas:</Text>
            <TextInput
              style={styles.input}
              value={notas}
              onChangeText={setNotas}
              placeholder="Agregar notas"
              multiline
            />
            <View style={styles.tipoContainer}>
              <View style={styles.switchContainer}>
                <Text style={styles.label}>Borrado:</Text>
                <Switch value={borrado} onValueChange={setBorrado} />
              </View>
              <View style={styles.switchContainer}>
                <Text style={styles.label}>Editado:</Text>
                <Switch value={editado} onValueChange={setEditado} />
              </View>
            </View>
          </View>
          <View style={styles.submitButtonContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEvent}>
              <Text style={styles.saveButtonText}>Guardar Evento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setModalVisible(false);
                setEditingEventId(null);
                resetForm();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <Modal
          visible={showProductPicker}
          animationType="slide"
          onRequestClose={() => setShowProductPicker(false)}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Seleccione un producto</Text>
            <FlatList
              data={productos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productItem}
                  onPress={() => {
                    setProducto(item.input);
                    setProductoColor(item.color);
                    setShowProductPicker(false);
                  }}
                >
                  <View style={styles.productItemContent}>
                    <View
                      style={[
                        styles.colorIndicator,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text style={styles.productText}>{item.input}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <Button title="Cerrar" onPress={() => setShowProductPicker(false)} />
          </View>
        </Modal>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  configButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#007BFF',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  configButtonText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007BFF',
  },
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  addButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  loadingText: { fontSize: 16, textAlign: 'center', marginVertical: 20 },
  modalContainer: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  section: { marginVertical: 15 },
  sectionBolsa: { flex: 1, flexDirection: 'column', justifyContent: 'space-between' },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  labelPrice: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 15,
    color: 'red'
  },
  fechaPrecio: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  tipoContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  tipoButton: {
    flex: 1,
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#ddd',
  },
  tipoButtonSelected: {
    backgroundColor: '#007BFF',
  },
  tipoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    gap: 20
  },
  submitButtonContainer: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-around' },
  saveButton: {
    backgroundColor: '#28A745',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelButton: {
    backgroundColor: '#FF4C4C',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  cancelButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  selectedProductText: { fontSize: 16, color: '#000' },
  placeholderText: { fontSize: 16, color: '#999' },
  productItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  separatorContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  separatorText: {
    backgroundColor: '#ffe27a',
    color: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: 'bold',
  },
  productItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  productText: {
    fontSize: 16,
  },
  eventListContainer: { flex: 1, marginBottom: 20 },
  eventItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  editIcon: { marginLeft: 10 },
});
