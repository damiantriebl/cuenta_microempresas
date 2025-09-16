const calcularTiempoDesde = (fecha: Date): string => {
    const ahora = new Date();
    const diferenciaMilisegundos = Math.abs(ahora.getTime() - fecha.getTime());
    const diferenciaDias = Math.floor(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
  
    if (diferenciaDias < 30) {
      return `hace ${diferenciaDias} ${diferenciaDias === 1 ? 'día' : 'días'}`;
    } else if (diferenciaDias < 365) {
      const meses = Math.floor(diferenciaDias / 30);
      const diasRestantes = diferenciaDias % 30;
      return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}${diasRestantes > 0 ? ` y ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}` : ''}`;
    } else {
      const años = Math.floor(diferenciaDias / 365);
      const mesesRestantes = Math.floor((diferenciaDias % 365) / 30);
      return `hace ${años} ${años === 1 ? 'año' : 'años'}${mesesRestantes > 0 ? ` y ${mesesRestantes} ${mesesRestantes === 1 ? 'mes' : 'meses'}` : ''}`;
    }
  };
  
  export default calcularTiempoDesde;