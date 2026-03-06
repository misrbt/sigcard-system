import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const BarChart = ({
  data,
  title = 'Bar Chart',
  height = 400,
  responsive = true,
  maintainAspectRatio = false,
  horizontal = false,
  barPercentage,
  categoryPercentage,
  ...options
}) => {
  const defaultOptions = {
    responsive,
    maintainAspectRatio,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: !!title,
        text: title,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    ...(barPercentage !== undefined && { barPercentage }),
    ...(categoryPercentage !== undefined && { categoryPercentage }),
    ...options,
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Bar data={data} options={defaultOptions} />
    </div>
  );
};

export default BarChart;