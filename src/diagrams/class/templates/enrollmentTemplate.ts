import { ClassArtifact as C } from '../artifactTypes';
import { createClassTemplateBuilder } from './templateBuilder';

/**
 * Matrícula universitaria: una clase intermedia (Matricula) convierte la relación
 * muchos a muchos entre estudiantes y cursos en algo con datos propios; un
 * departamento agrupa profesores que existen sin él (agregación).
 */
const b = createClassTemplateBuilder();

const department = b.classifier(C.class, 'Departamento\n--\n-nombre: String\n--\n+contratar(profesor)', { x: 0, y: 0 });
const teacher = b.classifier(C.class, 'Profesor\n--\n-legajo: String\n-nombre: String\n--\n+dictar(curso)', { x: 330, y: 0 });
const course = b.classifier(C.class, 'Curso\n--\n-codigo: String\n-cupo: Int\n--\n+hayCupo(): Boolean', { x: 660, y: 0 });
const student = b.classifier(C.class, 'Estudiante\n--\n-matricula: String\n-nombre: String\n--\n+inscribirse(curso)', { x: 0, y: 300 });
const enrollment = b.classifier(C.class, 'Matricula\n--\n-fecha: Date\n-nota: Decimal\n--\n+aprobar(nota)', { x: 330, y: 300 });
const status = b.classifier(C.enumeration, 'EstadoMatricula\n--\nINSCRITA\nAPROBADA\nREPROBADA\nANULADA\n--\n', { x: 660, y: 300 });

b.relation(department, teacher, C.aggregation, '1 agrupa 1..*');
b.relation(teacher, course, C.association, '1 dicta 0..*');
b.relation(student, enrollment, C.association, '1 tiene 0..*');
b.relation(enrollment, course, C.association, '0..* de 1');
b.relation(enrollment, status, C.association, 'estado');

export const enrollmentTemplate = b.build({
  id: 'class.enrollment',
  name: 'Matrícula universitaria',
  description: 'Una clase intermedia resuelve el muchos a muchos entre estudiantes y cursos; un departamento agrupa profesores (agregación) y un estado cerrado limita los valores.',
  difficulty: 'intermedio',
  learningGoals: [C.class, C.aggregation, C.association, C.enumeration],
});
