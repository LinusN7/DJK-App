import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WashList from '@/components/lists/WashList';
import LockerDutyList from '@/components/lists/LockerDutyList';
import PageHeader from "@/components/layout/PageHeader";


const Lists = () => {
  return (
    <div className="container mx-auto p-4 pb-20">
      <PageHeader title="Waschlisten" />
      
      <Tabs defaultValue="wash" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="wash">Trikotwäsche</TabsTrigger>
          <TabsTrigger value="locker">Kabinendienst</TabsTrigger>
        </TabsList>
        
        <TabsContent value="wash" className="mt-6">
          <WashList />
        </TabsContent>
        
        <TabsContent value="locker" className="mt-6">
          <LockerDutyList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Lists;
