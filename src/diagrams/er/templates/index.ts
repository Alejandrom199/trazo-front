import type { Template } from '@/core/model';
import { ErArtifact as E } from '../artifactTypes';
import { createErTemplateBuilder } from './templateBuilder';

/**
 * Ejemplos del MER, de menos a más: relaciones 1:N y N:M; atributos en la
 * relación, multivaluados y derivados; entidades débiles, relaciones
 * identificadoras, recursivas y atributos compuestos.
 */

const library = (() => {
  const b = createErTemplateBuilder();
  const member = b.entity('Socio', { x: 40, y: 200 });
  const loan = b.relationship('presta', { x: 330, y: 192 });
  const book = b.entity('Libro', { x: 600, y: 200 });
  b.attributes(member, [['id_socio', 'key'], 'nombre']);
  b.attributes(book, [['isbn', 'key'], 'título', 'autor']);
  b.attributes(loan, ['fecha_préstamo'], 'bottom');
  b.join(member, loan, '(0,N)');
  b.join(book, loan, '(0,N)');
  return b.build({
    id: 'er.library',
    name: 'Biblioteca: préstamos',
    description: 'Un socio pide libros prestados y un libro pasa por muchos socios: una relación N:M con su fecha.',
    difficulty: 'básico',
    learningGoals: [E.entity, E.keyAttribute, E.relationship, E.participation],
  });
})();

const store = (() => {
  const b = createErTemplateBuilder();
  const customer = b.entity('Cliente', { x: 40, y: 200 });
  const places = b.relationship('realiza', { x: 330, y: 192 });
  const order = b.entity('Pedido', { x: 600, y: 200 });
  b.attributes(customer, [['id_cliente', 'key'], 'nombre', 'correo']);
  b.attributes(order, [['número', 'key'], 'fecha', 'monto']);
  b.join(customer, places, '(0,N)');
  b.join(order, places, '(1,1)');
  return b.build({
    id: 'er.store',
    name: 'Tienda: clientes y pedidos',
    description: 'Un cliente realiza muchos pedidos y cada pedido es de un solo cliente: una relación 1:N.',
    difficulty: 'básico',
    learningGoals: [E.entity, E.attribute, E.keyAttribute, E.relationship],
  });
})();

const university = (() => {
  const b = createErTemplateBuilder();
  const student = b.entity('Estudiante', { x: 40, y: 230 });
  const enrolls = b.relationship('inscribe', { x: 330, y: 222 });
  const course = b.entity('Curso', { x: 620, y: 230 });
  const teaches = b.relationship('dicta', { x: 630, y: 420 });
  const teacher = b.entity('Profesor', { x: 620, y: 600 });
  b.attributes(student, [['legajo', 'key'], 'nombre', ['teléfonos', 'multi']]);
  b.attributes(course, [['código', 'key'], 'nombre', 'créditos']);
  b.attributes(enrolls, ['nota'], 'bottom');
  b.attributes(teacher, [['id_profesor', 'key'], 'nombre'], 'bottom');
  b.join(student, enrolls, '(0,N)');
  b.join(course, enrolls, '(0,N)');
  b.join(course, teaches, '(1,1)');
  b.join(teacher, teaches, '(0,N)');
  return b.build({
    id: 'er.university',
    name: 'Universidad: inscripciones',
    description: 'Estudiantes inscritos en cursos con su nota (dato de la relación) y profesores que los dictan.',
    difficulty: 'intermedio',
    learningGoals: [E.relationship, E.multivaluedAttribute, E.participation],
  });
})();

const clinic = (() => {
  const b = createErTemplateBuilder();
  const patient = b.entity('Paciente', { x: 40, y: 230 });
  const books = b.relationship('agenda', { x: 340, y: 222 });
  const doctor = b.entity('Médico', { x: 640, y: 230 });
  b.attributes(patient, [['dni', 'key'], 'nombre', 'fecha_nac', ['edad', 'derived']]);
  b.attributes(doctor, [['matrícula', 'key'], 'nombre', ['especialidades', 'multi']]);
  b.attributes(books, ['fecha_hora', 'motivo'], 'bottom');
  b.join(patient, books, '(0,N)');
  b.join(doctor, books, '(0,N)');
  return b.build({
    id: 'er.clinic',
    name: 'Clínica: citas',
    description: 'Pacientes que agendan citas con médicos; la edad se calcula y un médico tiene varias especialidades.',
    difficulty: 'intermedio',
    learningGoals: [E.derivedAttribute, E.multivaluedAttribute, E.relationship],
  });
})();

const orders = (() => {
  const b = createErTemplateBuilder();
  const order = b.entity('Pedido', { x: 40, y: 230 });
  const contains = b.identifying('contiene', { x: 320, y: 222 });
  const line = b.weakEntity('Línea de pedido', { x: 590, y: 230 });
  const includes = b.relationship('incluye', { x: 600, y: 430 });
  const product = b.entity('Producto', { x: 590, y: 620 });
  b.attributes(order, [['número', 'key'], 'fecha', ['total', 'derived']]);
  b.attributes(line, ['n_línea', 'cantidad']);
  b.attributes(product, [['código', 'key'], 'nombre', 'precio'], 'bottom');
  b.join(order, contains, '(1,N)');
  b.join(line, contains, '(1,1)');
  b.join(line, includes, '(1,1)');
  b.join(product, includes, '(0,N)');
  const remark = b.note('La línea se identifica por su número dentro del pedido.', { x: 880, y: 120 });
  b.anchor(remark, line);
  return b.build({
    id: 'er.orders',
    name: 'Pedidos con líneas de detalle',
    description: 'Cada línea solo existe dentro de su pedido (entidad débil) e incluye un producto; el total se calcula.',
    difficulty: 'avanzado',
    learningGoals: [E.weakEntity, E.identifyingRelationship, E.derivedAttribute],
  });
})();

const company = (() => {
  const b = createErTemplateBuilder();
  const employee = b.entity('Empleado', { x: 300, y: 260 });
  const supervises = b.relationship('supervisa', { x: 40, y: 430 });
  const worksIn = b.relationship('trabaja en', { x: 590, y: 252 });
  const department = b.entity('Departamento', { x: 880, y: 260 });
  const [, , address] = b.attributes(employee, [['id_empleado', 'key'], 'nombre', 'dirección']);
  b.attributes(department, [['código', 'key'], 'nombre']);
  // Atributo compuesto: «dirección» se divide en calle y ciudad.
  b.attributes(address!, ['calle', 'ciudad']);
  // Relación recursiva: el empleado juega dos papeles, supervisor y supervisado.
  b.join(employee, supervises, '(0,1)');
  b.join(employee, supervises, '(0,N)', [{ x: 375, y: 470 }]);
  b.join(employee, worksIn, '(1,1)');
  b.join(department, worksIn, '(1,N)');
  return b.build({
    id: 'er.company',
    name: 'Empresa: empleados y supervisión',
    description: 'Un empleado supervisa a otros (relación recursiva) y su dirección se compone de calle y ciudad.',
    difficulty: 'avanzado',
    learningGoals: [E.relationship, E.attribute, E.participation],
  });
})();

export const erTemplates: Template[] = [library, store, university, clinic, orders, company];
