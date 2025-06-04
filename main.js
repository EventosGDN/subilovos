async function uploadVideo() {
  const file = document.getElementById('videoInput').files[0];
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  const status = document.getElementById('status');

  if (!file || !start || !end) {
    status.textContent = 'Completá todos los campos.';
    return;
  }

  const fileRef = storage.ref().child('videos/' + file.name);
  try {
    status.textContent = 'Subiendo...';
    await fileRef.put(file);
    const url = await fileRef.getDownloadURL();

    await db.collection('videos').add({
      name: file.name,
      url: url,
      startDate: start,
      endDate: end,
      timestamp: new Date().toISOString()
    });

    status.textContent = 'Subido y registrado correctamente.';
  } catch (error) {
    status.textContent = 'Error al subir: ' + error.message;
  }
}
