import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const PieChart = ({
  data,
  title = 'Pie Chart',
  height = 400,
  responsive = true,
  maintainAspectRatio = false,
  showLabels = true,
  ...options
}) => {
  const defaultOptions = {
    responsive,
    maintainAspectRatio,
    plugins: {
      legend: {
        position: 'right',
        display: showLabels,
      },
      title: {
        display: !!title,
        text: title,
      },
    },
    ...options,
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Pie data={data} options={defaultOptions} />
    </div>
  );
};

export default PieChart;