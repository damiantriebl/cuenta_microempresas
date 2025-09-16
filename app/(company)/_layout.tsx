import { Stack } from 'expo-router';
import React from 'react';

export default function CompanyLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Gestión de Empresas',
          headerStyle: {
            backgroundColor: '#25B4BD',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
      <Stack.Screen 
        name="requests" 
        options={{ 
          title: 'Solicitudes de Acceso',
          headerStyle: {
            backgroundColor: '#25B4BD',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
      <Stack.Screen 
        name="members" 
        options={{ 
          title: 'Miembros de la Empresa',
          headerStyle: {
            backgroundColor: '#25B4BD',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
    </Stack>
  );
}


