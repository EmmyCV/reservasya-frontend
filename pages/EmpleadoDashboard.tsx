import React from 'react';
import EmployeeCalendar from '../components/EmployeeCalendar';
import EmployeeServices from "../components/admin/EmployeeServices";
import EmployeeSchedule from "../components/admin/EmployeeSchedule";

const EmpleadoDashboard: React.FC = () => {
	return (
		<div className="py-8 space-y-6">
			<div>
				<h1 className="text-2xl font-bold" style={{ color: '#9F6A6A' }}>Panel del Empleado</h1>
				<p className="mt-2 text-gray-600">Aquí podrás ver tus citas y gestionar tu agenda.</p>
			</div>

			<EmployeeCalendar />
			<EmployeeServices />
            <EmployeeSchedule />
		</div>
	);
};

export default EmpleadoDashboard;
